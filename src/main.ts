import { Notice, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { DEFAULT_SETTINGS } from "src/const/settings";
import { VIEW_IDS } from "src/const/views";
import { rebuild_graph } from "src/graph/builders";
import type { BreadcrumbsSettings } from "src/interfaces/settings";
import { BreadcrumbsSettingTab } from "src/settings/SettingsTab";
import { active_file_store } from "src/stores/active_file";
import { MatrixView } from "src/views/matrix";
import { PROD } from "./const";
import { dataview_plugin } from "./external/dataview";
import { BCGraph } from "./graph/MyMultiGraph";
import { Traverse } from "./graph/traverse";
import { stringify_edge } from "./graph/utils";
import { migrate_old_settings } from "./settings/migration";
import { draw_page_views_on_active_note } from "./views/page";

export default class BreadcrumbsPlugin extends Plugin {
	settings!: BreadcrumbsSettings;
	graph = new BCGraph();

	async onload() {
		console.log("loading breadcrumbs");

		// Settings
		await this.loadSettings();

		/// Migrations
		await migrate_old_settings(this);

		this.addSettingTab(new BreadcrumbsSettingTab(this.app, this));

		this.app.workspace.onLayoutReady(async () => {
			console.log("onLayoutReady");

			await dataview_plugin.await_if_enabled(this);

			this.refresh();

			// Events
			this.registerEvent(
				this.app.workspace.on("file-open", async (file) => {
					console.log("file-open");

					active_file_store.set(file);

					if (file) {
						draw_page_views_on_active_note(this);
					}
				}),
			);

			this.registerEvent(
				this.app.vault.on("create", (file) => {
					console.log("create", file.path);
					if (file instanceof TFile) {
						// This isn't perfect, but it stops any "node doesn't exist" errors
						// The user will have to refresh to add any relevant edges
						this.graph.safe_add_node(file.path, {
							resolved: true,
						});
					}
				}),
			);

			this.registerEvent(
				this.app.vault.on("rename", (file, old_path) => {
					console.log("rename", old_path, "->", file.path);
					if (file instanceof TFile) {
						this.graph.safe_rename_node(old_path, file.path);
					}
				}),
			);

			this.registerEvent(
				this.app.vault.on("delete", (file) => {
					console.log("delete", file.path);
					if (file instanceof TFile) {
						// Conveniently drops any relevant edges
						this.graph.dropNode(file.path);
					}
				}),
			);

			// Views
			this.registerView(
				VIEW_IDS.matrix,
				(leaf) => new MatrixView(leaf, this),
			);
		});

		// Commands
		this.addCommand({
			id: "breadcrumbs:rebuild-graph",
			name: "Rebuild graph",
			callback: () => this.refresh(),
		});

		this.addCommand({
			id: "breadcrumbs:open-matrix-view",
			name: "Open matrix view",
			callback: () => this.activateView(VIEW_IDS.matrix),
		});

		if (!PROD) {
			this.addCommand({
				id: "breadcrumbs:test-command",
				name: "Test command",
				callback: () => {
					console.log("test command");
					const file = this.app.workspace.getActiveFile();
					if (!file) return;

					const paths = Traverse.all_paths(
						"depth_first",
						this.graph,
						file.path,
						(e) => e.attr.dir === "up",
					);
					console.log("paths", paths);

					console.log(
						paths.map((path) =>
							path.map((edge) => stringify_edge(edge)),
						),
					);

					console.log(
						Traverse.paths_to_index_list(paths, {
							indent: "\t",
							link_kind: "wiki",
							show_node_options: {
								ext: false,
								alias: true,
								folder: false,
							},
						}),
					);
				},
			});
		}
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);

		console.log("settings", this.settings);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/** rebuild_graph, then react by updating active_file_store and redrawing page_views */
	refresh() {
		console.log("bc.refresh");

		const start_ms = Date.now();

		const notice = new Notice("Rebuilding BC graph");

		// Rebuild the graph
		this.graph = rebuild_graph(this);

		// _Then_ react
		active_file_store.refresh(this.app);

		draw_page_views_on_active_note(this);

		notice.setMessage(`Rebuilt BC graph in ${Date.now() - start_ms}ms`);
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
