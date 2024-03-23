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
import { DIRECTIONS } from "./const/hierarchies";
import { dataview_plugin } from "./external/dataview";
import { BCGraph } from "./graph/MyMultiGraph";
import { CreateListIndexModal } from "./modals/CreateListIndexModal";
import { migrate_old_settings } from "./settings/migration";
import { deep_merge_objects } from "./utils/objects";
import { redraw_page_views } from "./views/page";
import { TreeView } from "./views/tree";

export default class BreadcrumbsPlugin extends Plugin {
	settings!: BreadcrumbsSettings;
	graph = new BCGraph();
	api!: BCAPI;

	async onload() {
		console.log("loading breadcrumbs");

		// Settings
		await this.loadSettings();

		/// Migrations
		await migrate_old_settings(this);

		this.addSettingTab(new BreadcrumbsSettingTab(this.app, this));

		// API
		// NOTE: I think this should be done quite early
		// Especially before dataview, since the api would get used alot in dv codeblocks
		this.api = new BCAPI(this);

		window.BCAPI = this.api;
		this.register(
			// @ts-ignore: Don't want to make it optional, but still delete on unload
			() => delete window.BCAPI,
		);

		this.app.workspace.onLayoutReady(async () => {
			console.log("onLayoutReady");

			await dataview_plugin.await_if_enabled(this);

			await this.refresh();

			// Events
			/// Workspace

			// TODO: This doesn't trigger on tab-change
			// Find a different event to hook into
			this.registerEvent(
				this.app.workspace.on("layout-change", async () => {
					console.log("layout-change");

					await this.refresh({
						rebuild_graph:
							this.settings.commands.rebuild_graph.trigger
								.layout_change,
					});
				}),
			);

			/// Vault
			this.registerEvent(
				this.app.vault.on("create", (file) => {
					console.log("on.create:", file.path);
					if (file instanceof TFile) {
						// This isn't perfect, but it stops any "node doesn't exist" errors
						// The user will have to refresh to add any relevant edges
						this.graph.upsert_node(file.path, { resolved: true });

						// NOTE: No need to this.refresh. The envent triggers a layout-change anyway
					}
				}),
			);

			this.registerEvent(
				this.app.vault.on("rename", (file, old_path) => {
					console.log("on.rename:", old_path, "->", file.path);
					if (file instanceof TFile) {
						this.graph.safe_rename_node(old_path, file.path);

						// NOTE: No need to this.refresh. The envent triggers a layout-change anyway
					}
				}),
			);

			this.registerEvent(
				this.app.vault.on("delete", (file) => {
					console.log("on.delete:", file.path);
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

						// NOTE: No need to this.refresh. The envent triggers a layout-change anyway
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

			// Codeblocks
			this.registerMarkdownCodeBlockProcessor(
				"breadcrumbs",
				(source, el, ctx) => {
					const mdrc = new CodeblockMDRC(this, el, source);
					ctx.addChild(mdrc);
				},
			);
		});

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
			name: "Print graph stats",
			callback: () => {
				const stats = get_graph_stats(this.graph);

				console.log(stats);
				new Notice("Graph stats printed to console");
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

		// Jump to first neighbour
		DIRECTIONS.forEach((dir) => {
			this.addCommand({
				id: `breadcrumbs:jump-to-first-neighbour-dir:${dir}`,
				name: `Jump to first neigbour in direction:${dir}`,
				callback: () => jump_to_neighbour(this, { attr: { dir } }),
			});
		});
		this.settings.hierarchies.forEach((hierarchy, hierarchy_i) => {
			DIRECTIONS.forEach((dir) => {
				const fields_str = hierarchy.dirs[dir].join(",");
				if (!fields_str.length) return;

				this.addCommand({
					id: `breadcrumbs:jump-to-first-neighbour-field:${hierarchy_i}-${dir}`,
					name: `Jump to first neighbour by field:${fields_str}`,
					callback: () =>
						jump_to_neighbour(this, {
							attr: { hierarchy_i, dir },
						}),
				});
			});
		});
	}

	onunload() {}

	async loadSettings() {
		this.settings = deep_merge_objects(
			(await this.loadData()) ?? {},
			DEFAULT_SETTINGS as any,
		);

		console.log("bc.loadsettings", this.settings);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/** rebuild_graph, then react by updating active_file_store and redrawing page_views.
	 * Optionally disable any of these steps.
	 */
	async refresh(options?: {
		rebuild_graph?: boolean;
		active_file_store?: boolean;
		redraw_page_views?: boolean;
	}) {
		console.group("bc.refresh");

		console.log(
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

			console.group("rebuild_graph");
			this.graph = await rebuild_graph(this);
			console.groupEnd();

			notice?.setMessage(`Rebuilt graph in ${Date.now() - start_ms}ms`);
		}

		// _Then_ react
		if (options?.active_file_store !== false) {
			active_file_store.refresh(this.app);
		}

		if (options?.redraw_page_views !== false) {
			console.groupCollapsed("redraw_page_views");
			redraw_page_views(this);
			console.groupEnd();
		}

		console.groupEnd();
	}

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
				console.log("bc.activateView: no leaf found");
				return;
			}

			await leaf.setViewState({ type: view_id, active: true });
		}

		// "Reveal" the leaf in case it is in a collapsed sidebar
		workspace.revealLeaf(leaf);
	}
}
