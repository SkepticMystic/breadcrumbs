import { MultiGraph } from "graphology";
import { Notice, Plugin, WorkspaceLeaf } from "obsidian";
import { DEFAULT_SETTINGS } from "src/const/settings";
import { VIEW_IDS } from "src/const/views";
import { rebuild_graph } from "src/graph/builders";
import type { BreadcrumbsGraph } from "src/interfaces/graph";
import type { BreadcrumbsSettings } from "src/interfaces/settings";
import { BreadcrumbsSettingTab } from "src/settings/SettingsTab";
import { active_file_store } from "src/stores/active_file";
import { MatrixView } from "src/views/matrix";
import { dataview_plugin } from "./external/dataview";
import { migrate_old_settings } from "./settings/migration";
import { draw_page_views_on_active_note } from "./views/page";

export default class BreadcrumbsPlugin extends Plugin {
	settings!: BreadcrumbsSettings;
	graph: BreadcrumbsGraph = new MultiGraph();

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

					draw_page_views_on_active_note(this);
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

	/** Refresh active_file_store, then rebuild_graph */
	refresh() {
		console.log("bc.refresh");

		const start_ms = Date.now();

		const notice = new Notice("Rebuilding graph");

		// Rebuild the graph
		this.graph = rebuild_graph(this);

		// _Then_ react
		active_file_store.refresh(this.app);

		draw_page_views_on_active_note(this);

		const duration_ms = Date.now() - start_ms;
		notice.setMessage(`Done in ${duration_ms}ms`);
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

			await leaf.setViewState({ type: view_id, active: true });
		}

		// "Reveal" the leaf in case it is in a collapsed sidebar
		workspace.revealLeaf(leaf);
	}
}
