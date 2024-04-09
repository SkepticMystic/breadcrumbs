import { Notice, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { DEFAULT_SETTINGS } from "src/const/settings";
import { VIEW_IDS } from "src/const/views";
import { rebuild_graph } from "src/graph/builders";
import type { BreadcrumbsSettings } from "src/interfaces/settings";
import { BreadcrumbsSettingTab } from "src/settings/SettingsTab";
import { active_file_store } from "src/stores/active_file";
import { MatrixView } from "src/views/matrix";
import { get } from "svelte/store";
import { BCAPI } from "./api";
import { CodeblockMDRC } from "./codeblocks/MDRC";
import { freeze_implied_edges_to_note } from "./commands/freeze_edges";
import { jump_to_neighbour } from "./commands/jump";
import { get_graph_stats } from "./commands/stats";
import { thread } from "./commands/thread";
import { DIRECTIONS } from "./const/hierarchies";
import { METADATA_FIELDS_MAP } from "./const/metadata_fields";
import { dataview_plugin } from "./external/dataview";
import { BCGraph } from "./graph/MyMultiGraph";
import type { BreadcrumbsError } from "./interfaces/graph";
import { log } from "./logger";
import { CreateListIndexModal } from "./modals/CreateListIndexModal";
import { migrate_old_settings } from "./settings/migration";
import { HierarchyFieldSuggestor } from "./suggestor/hierarchy-field";
import { get_all_hierarchy_fields } from "./utils/hierarchies";
import { deep_merge_objects } from "./utils/objects";
import { redraw_page_views } from "./views/page";
import { TreeView } from "./views/tree";
import { Codeblocks } from "src/codeblocks";

export default class BreadcrumbsPlugin extends Plugin {
	settings!: BreadcrumbsSettings;
	graph = new BCGraph();
	api!: BCAPI;

	async onload() {
		// Settings
		await this.loadSettings();

		// Logger
		log.set_level(this.settings.debug.level);

		log.info("loading Breadcrumbs plugin");
		log.debug("settings >", this.settings);

		/// Migrations
		await migrate_old_settings(this);

		// Set the hierarchy-fields & BC-meta-fields to the right Properties type
		try {
			const now = Date.now();

			const all_properties =
				this.app.metadataTypeManager.getAllProperties();

			for (const field of get_all_hierarchy_fields(
				this.settings.hierarchies,
			)) {
				if (all_properties[field].type === "multitext") continue;
				this.app.metadataTypeManager.setType(field, "multitext");
			}

			for (const [field, { property_type }] of Object.entries(
				METADATA_FIELDS_MAP,
			)) {
				if (all_properties[field].type === property_type) continue;
				this.app.metadataTypeManager.setType(field, property_type);
			}

			log.debug(
				"metadataTypeManager.setTypes took",
				Date.now() - now,
				"ms",
			);
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
		if (this.settings.suggestors.hierarchy_field.enabled) {
			this.registerEditorSuggest(new HierarchyFieldSuggestor(this));
		}

		this.app.workspace.onLayoutReady(async () => {
			log.debug("on:layout-ready");

			await dataview_plugin.await_if_enabled(this);

			await this.refresh();

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

			/// Vault
			this.registerEvent(
				this.app.vault.on("create", (file) => {
					log.debug("on:create >", file.path);

					if (file instanceof TFile) {
						// This isn't perfect, but it stops any "node doesn't exist" errors
						// The user will have to refresh to add any relevant edges
						this.graph.upsert_node(file.path, { resolved: true });

						// NOTE: No need to this.refresh. The event triggers a layout-change anyway
					}
				}),
			);

			this.registerEvent(
				this.app.vault.on("rename", (file, old_path) => {
					log.debug("on:rename >", old_path, "->", file.path);

					if (file instanceof TFile) {
						const res = this.graph.safe_rename_node(
							old_path,
							file.path,
						);

						if (!res.ok) {
							log.error("safe_rename_node >", res.error.message);
						}

						// NOTE: No need to this.refresh. The event triggers a layout-change anyway
					}
				}),
			);

			this.registerEvent(
				this.app.vault.on("delete", (file) => {
					log.debug("on:delete >", file.path);

					if (file instanceof TFile) {
						// NOTE: Instead of dropping it, we mark it as unresolved.
						//   There are pros and cons to both, but unresolving it is less intense.
						//   There may still be a typed link:: to that file, so it shouldn't drop off the graph.
						//   So it's not perfect. Rebuilding the graph is the only way to be sure.
						this.graph.setNodeAttribute(
							file.path,
							"resolved",
							false,
						);

						// NOTE: No need to this.refresh. The event triggers a layout-change anyway
					}
				}),
			);

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
				const mdrc = new CodeblockMDRC(this, el, source);
				ctx.addChild(mdrc);
			},
		);

		// Commands
		this.addCommand({
			id: "breadcrumbs:rebuild-graph",
			name: "Rebuild graph",
			callback: async () => await this.refresh(),
		});

		Object.keys(VIEW_IDS).forEach((view_id) => {
			this.addCommand({
				id: `breadcrumbs:open-${view_id}-view`,
				name: `Open ${view_id} view`,
				callback: () =>
					this.activateView(
						VIEW_IDS[view_id as keyof typeof VIEW_IDS],
					),
			});
		});

		this.addCommand({
			id: "breadcrumbs:create-list-index",
			name: "Create list index",
			callback: () => {
				new CreateListIndexModal(this.app, this).open();
			},
		});

		this.addCommand({
			id: "breadcrumbs:graph-stats",
			name: "Show/Copy graph stats",
			callback: async () => {
				const stats = get_graph_stats(this.graph);

				console.log(stats);

				await navigator.clipboard.writeText(
					JSON.stringify(stats, null, 2),
				);

				new Notice(
					"Graph stats printed to console and copied to clipboard",
				);
			},
		});

		this.addCommand({
			id: "breadcrumbs:freeze-implied-edges-to-note",
			name: "Freeze implied edges to note",
			callback: async () => {
				// TODO: Probably add an intermediate modal to specify options
				// The whole point is to make implied edges explicit
				// So once you freeze them, they'll be duplicated
				// So, in the options modal, you could temporarily enabled/disable certain implied_relations on the hierarchy
				// preventing duplicates for implied_relations that weren't properly enabled
				const active_file = get(active_file_store);
				if (!active_file) return;

				await freeze_implied_edges_to_note(
					this,
					active_file,
					this.settings.commands.freeze_implied_edges.default_options,
				);

				new Notice("Implied edges frozen to note");
			},
		});

		/// Jump to first neighbour
		DIRECTIONS.forEach((dir) => {
			this.addCommand({
				id: `breadcrumbs:jump-to-first-neighbour-dir:${dir}`,
				name: `Jump to first neigbour in direction:${dir}`,
				callback: () => jump_to_neighbour(this, { attr: { dir } }),
			});
		});
		this.settings.hierarchies.forEach((hierarchy) => {
			DIRECTIONS.forEach((dir) => {
				hierarchy.dirs[dir].forEach((field) => {
					if (!field) return;

					this.addCommand({
						id: `breadcrumbs:jump-to-first-neighbour-field:${field}`,
						name: `Jump to first neighbour by field:${field}`,
						callback: () =>
							jump_to_neighbour(this, { attr: { field } }),
					});
				});
			});
		});

		// Thread
		this.settings.hierarchies.forEach((hierarchy, hierarchy_i) => {
			DIRECTIONS.forEach((dir) => {
				hierarchy.dirs[dir].forEach((field) => {
					if (!field) return;

					this.addCommand({
						id: `breadcrumbs:thread-field:${field}`,
						name: `Thread by field:${field}`,
						callback: () =>
							thread(
								this,
								{ hierarchy_i, dir, field },
								this.settings.commands.thread.default_options,
							),
					});
				});
			});
		});

		log.debug("loaded Breadcrumbs plugin");
	}

	onunload() {}

	async loadSettings() {
		this.settings = deep_merge_objects(
			(await this.loadData()) ?? {},
			DEFAULT_SETTINGS as any,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/** rebuild_graph, then react by updating active_file_store and redrawing page_views.
	 * Optionally disable any of these steps.
	 */
	refresh = async (options?: {
		rebuild_graph?: boolean;
		active_file_store?: boolean;
		redraw_page_views?: boolean;
		redraw_codeblocks?: boolean;
	}) => {
		log.debug(
			"refresh >",
			["rebuild_graph", "active_file_store", "redraw_page_views"]
				.filter(
					(key) => options?.[key as keyof typeof options] !== false,
				)
				.join(", "),
		);

		// Rebuild the graph
		if (options?.rebuild_graph !== false) {
			const start_ms = Date.now();

			const notice = this.settings.commands.rebuild_graph.notify
				? new Notice("Rebuilding graph")
				: null;

			const rebuild_results = await rebuild_graph(this);
			this.graph = rebuild_results.graph;

			const explicit_edge_errors = rebuild_results.explicit_edge_results
				.filter((result) => result.errors.length)
				.reduce(
					(acc, { source, errors }) => {
						acc[source] = errors;
						return acc;
					},
					{} as Record<string, BreadcrumbsError[]>,
				);

			if (Object.keys(explicit_edge_errors).length) {
				log.warn("explicit_edge_errors >", explicit_edge_errors);
			}

			notice?.setMessage(
				[
					`Rebuilt graph in ${Date.now() - start_ms}ms`,

					explicit_edge_errors.length
						? "\nErrors (see console for details):"
						: null,

					...Object.entries(explicit_edge_errors).map(
						([source, errors]) =>
							`- ${source}: ${errors.length} errors`,
					),
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

		if (options?.redraw_codeblocks !== false) {
			Codeblocks.update_codeblocks();
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
