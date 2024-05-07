import { Events, Notice, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { Codeblocks } from "src/codeblocks";
import { DEFAULT_SETTINGS } from "src/const/settings";
import { VIEW_IDS } from "src/const/views";
import { rebuild_graph } from "src/graph/builders";
import type { BreadcrumbsSettings } from "src/interfaces/settings";
import { BreadcrumbsSettingTab } from "src/settings/SettingsTab";
import { active_file_store } from "src/stores/active_file";
import { MatrixView } from "src/views/matrix";
import { BCAPI } from "./api";
import { CodeblockMDRC } from "./codeblocks/MDRC";
import { init_all_commands } from "./commands/init";
import { METADATA_FIELDS_MAP } from "./const/metadata_fields";
import { dataview_plugin } from "./external/dataview";
import type { BreadcrumbsError } from "./interfaces/graph";
import { log } from "./logger";
import { migrate_old_settings } from "./settings/migration";
import { EdgeFieldSuggestor } from "./suggestor/edge_fields";
import { deep_merge_objects } from "./utils/objects";
import { Timer } from "./utils/timer";
import { redraw_page_views } from "./views/page";
import { TreeView } from "./views/tree";
import wasmbin from '../wasm/pkg/breadcrumbs_graph_wasm_bg.wasm';
import init, {
	type InitInput,
	type NoteGraph,
	TransitiveGraphRule,
	create_graph,
	GraphConstructionNodeData,
	GraphConstructionEdgeData,
	BatchGraphUpdate,
	RemoveNoteGraphUpdate,
	AddNoteGraphUpdate,
} from '../wasm/pkg';

export enum BCEvent {
	GRAPH_UPDATE = "graph-update",
}

export default class BreadcrumbsPlugin extends Plugin {
	settings!: BreadcrumbsSettings;
	graph!: NoteGraph;
	api!: BCAPI;
	events!: Events;

	async onload() {
		// Settings
		await this.loadSettings();

		// Logger
		log.set_level(this.settings.debug.level);

		log.info(
			`loading plugin "${this.manifest.name}" plugin v${this.manifest.version}`,
		);
		log.debug("settings >", this.settings);

		// Init event bus
		this.events = new Events();

		// Init wasm
		await init(wasmbin);
		this.graph = create_graph();
		this.graph.set_update_callback(() => {
			// funny micro task so that the rust update function finishes before we access the graph again for the visualization
			// this is needed because otherwise we get an "recursive use of an object detected which would lead to unsafe aliasing in rust" error
			// see https://github.com/rustwasm/wasm-bindgen/issues/1578
			queueMicrotask(() => this.events.trigger(BCEvent.GRAPH_UPDATE));
		});

		/// Migrations
		this.settings = migrate_old_settings(this.settings);
		await this.saveSettings();

		// Set the edge_fields & BC-meta-fields to the right Properties type
		try {
			const all_properties =
				this.app.metadataTypeManager.getAllProperties();

			for (const field of this.settings.edge_fields) {
				if (all_properties[field.label]?.type === "multitext") continue;
				this.app.metadataTypeManager.setType(field.label, "multitext");
			}

			for (const [field, { property_type }] of Object.entries(
				METADATA_FIELDS_MAP,
			)) {
				if (all_properties[field]?.type === property_type) continue;
				this.app.metadataTypeManager.setType(field, property_type);
			}
		} catch (error) {
			log.error("metadataTypeManager.setType error >", error);
		}

		this.addSettingTab(new BreadcrumbsSettingTab(this.app, this));

		// API
		// NOTE: I think this should be done quite early
		// Especially before dataview, since the api would get used alot in dv codeblocks
		this.api = new BCAPI(this);

		// @ts-ignore: I can extend window, but this is the only place
		window.BCAPI = this.api;
		this.register(
			// @ts-ignore: Don't want to make it optional, but still delete on unload
			() => delete window.BCAPI,
		);

		this.registerHoverLinkSource("breadcrumbs", {
			defaultMod: true,
			display: "Breadcrumbs",
		});

		// Suggestors
		if (this.settings.suggestors.edge_field.enabled) {
			this.registerEditorSuggest(new EdgeFieldSuggestor(this));
		}

		this.app.workspace.onLayoutReady(async () => {
			log.debug("on:layout-ready");

			// Wait for DV and metadataCache before refreshing
			await dataview_plugin.await_if_enabled(this);

			if (this.app.metadataCache.initialized) {
				log.debug("metadataCache:initialized");

				await this.refresh();
			} else {
				const metadatacache_init_event = this.app.metadataCache.on(
					"initialized",
					async () => {
						log.debug("on:metadatacache-initialized");

						await this.refresh();
						this.app.metadataCache.offref(metadatacache_init_event);
					},
				);
			}

			// Events
			/// Workspace
			this.registerEvent(
				this.app.workspace.on("layout-change", async () => {
					log.debug("on:layout-change");

					await this.refresh({
						rebuild_graph:
							this.settings.commands.rebuild_graph.trigger
								.layout_change,
					});
				}),
			);

			this.registerEvent(
				this.app.workspace.on("active-leaf-change", async (leaf) => {
					log.debug("on:active-leaf-change");

					// NOTE: We only want to refresh the store when changing to another md note
					if (leaf?.getViewState().type !== "markdown") {
						return;
					}

					// NOTE: layout-change covers _most_ of the same events, but this is for changing tabs (and possibly other stuff)
					this.refresh({
						rebuild_graph: false,
						redraw_page_views: false,
					});
				}),
			);

			// TODO
			// /// Vault
			// this.registerEvent(
			// 	this.app.vault.on("create", (file) => {
			// 		log.debug("on:create >", file.path);

			// 		if (file instanceof TFile) {
			// 			// This isn't perfect, but it stops any "node doesn't exist" errors
			// 			// The user will have to refresh to add any relevant edges
			// 			this.graph.upsert_node(file.path, { resolved: true });

			// 			// NOTE: No need to this.refresh. The event triggers a layout-change anyway
			// 		}
			// 	}),
			// );

			// this.registerEvent(
			// 	this.app.vault.on("rename", (file, old_path) => {
			// 		log.debug("on:rename >", old_path, "->", file.path);

			// 		if (file instanceof TFile) {
			// 			const res = this.graph.safe_rename_node(
			// 				old_path,
			// 				file.path,
			// 			);

			// 			if (!res.ok) {
			// 				log.error("safe_rename_node >", res.error.message);
			// 			}

			// 			// NOTE: No need to this.refresh. The event triggers a layout-change anyway
			// 		}
			// 	}),
			// );

			// this.registerEvent(
			// 	this.app.vault.on("delete", (file) => {
			// 		log.debug("on:delete >", file.path);

			// 		if (file instanceof TFile) {
			// 			// NOTE: Instead of dropping it, we mark it as unresolved.
			// 			//   There are pros and cons to both, but unresolving it is less intense.
			// 			//   There may still be a typed link:: to that file, so it shouldn't drop off the graph.
			// 			//   So it's not perfect. Rebuilding the graph is the only way to be sure.
			// 			this.graph.setNodeAttribute(
			// 				file.path,
			// 				"resolved",
			// 				false,
			// 			);

			// 			// NOTE: No need to this.refresh. The event triggers a layout-change anyway
			// 		}
			// 	}),
			// );

			// Views
			this.registerView(
				VIEW_IDS.matrix,
				(leaf) => new MatrixView(leaf, this),
			);
			this.registerView(
				VIEW_IDS.tree,
				(leaf) => new TreeView(leaf, this),
			);
		});

		// Codeblocks
		this.registerMarkdownCodeBlockProcessor(
			"breadcrumbs",
			(source, el, ctx) => {
				const mdrc = new CodeblockMDRC(
					this,
					el,
					source,
					ctx.sourcePath,
				);
				ctx.addChild(mdrc);
			},
		);

		// Commands
		init_all_commands(this);

		log.debug("loaded Breadcrumbs plugin");
	}

	onunload() { }

	async loadSettings() {
		this.settings = deep_merge_objects(
			(await this.loadData()) ?? {},
			DEFAULT_SETTINGS as any,
		);
	}

	async saveSettings() {
		this.settings.is_dirty = false;

		await this.saveData(this.settings);
	}

	/** rebuild_graph, then react by updating active_file_store and redrawing page_views.
	 * Optionally disable any of these steps.
	 */
	async refresh(options?: {
		rebuild_graph?: boolean;
		active_file_store?: boolean;
		redraw_page_views?: boolean;
		redraw_side_views?: true;
		redraw_codeblocks?: boolean;
	}) {
		// Rebuild the graph
		if (options?.rebuild_graph !== false) {
			const timer = new Timer();

			const notice = this.settings.commands.rebuild_graph.notify
				? new Notice("Rebuilding graph")
				: null;

			const rebuild_results = await rebuild_graph(this);
			// this.graph = rebuild_results.graph;

			const explicit_edge_errors = rebuild_results.explicit_edge_results
				.filter(({ results }) => results.errors.length)
				.reduce(
					(acc, { source, results }) => {
						acc[source] = results.errors;
						return acc;
					},
					{} as Record<string, BreadcrumbsError[]>,
				);

			// const implied_edge_results = Object.fromEntries(
			// 	Object.entries(rebuild_results.implied_edge_results)
			// 		.filter(([_, errors]) => errors.length)
			// 		.map(([implied_kind, errors]) => [implied_kind, errors]),
			// );

			if (Object.keys(explicit_edge_errors).length) {
				log.warn("explicit_edge_errors >", explicit_edge_errors);
			}
			// if (Object.keys(implied_edge_results).length) {
			// 	log.warn("implied_edge_results >", implied_edge_results);
			// }

			notice?.setMessage(
				[
					`Rebuilt graph in ${timer.elapsed_str()}ms`,

					explicit_edge_errors.length
						? "\nExplicit edge errors (see console for details):"
						: null,

					...Object.entries(explicit_edge_errors).map(
						([source, errors]) =>
							`- ${source}: ${errors.length} errors`,
					),

					// implied_edge_results.length
					// 	? "\nImplied edge errors (see console for details):"
					// 	: null,

					// ...Object.entries(implied_edge_results).map(
					// 	([implied_kind, errors]) =>
					// 		`- ${implied_kind}: ${errors.length} errors`,
					// ),
				]
					.filter(Boolean)
					.join("\n"),
			);
		}

		// _Then_ react
		if (options?.active_file_store !== false) {
			active_file_store.refresh(this.app);
		}

		if (options?.redraw_page_views !== false) {
			redraw_page_views(this);
		}

		// if (options?.redraw_codeblocks !== false) {
		// 	Codeblocks.update_all();
		// }

		if (options?.redraw_side_views === true) {
			this.app.workspace
				.getLeavesOfType(VIEW_IDS.matrix)
				.forEach((leaf) => {
					(leaf.view as MatrixView).onOpen();
				});
			this.app.workspace
				.getLeavesOfType(VIEW_IDS.tree)
				.forEach((leaf) => {
					(leaf.view as TreeView).onOpen();
				});
		}
	};

	// SOURCE: https://docs.obsidian.md/Plugins/User+interface/Views
	async activateView(view_id: string, options?: { side?: "left" | "right" }) {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(view_id);

		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0];
		} else {
			// Our view could not be found in the workspace, create a new leaf in the right sidebar for it.
			// Default is to open on the right
			leaf =
				options?.side === "left"
					? workspace.getLeftLeaf(false)
					: workspace.getRightLeaf(false);

			if (!leaf) {
				log.warn("activate_view > no leaf found");
				return;
			}

			await leaf.setViewState({ type: view_id, active: true });
		}

		// "Reveal" the leaf in case it is in a collapsed sidebar
		workspace.revealLeaf(leaf);
	}
}
