import { Plugin, WorkspaceLeaf } from "obsidian";
import { DEFAULT_SETTINGS } from "src/const/settings";
import { VIEW_IDS } from "src/const/views";
import { rebuildGraph } from "src/graph/build";
import type { BreadcrumbsGraph } from "src/interfaces/graph";
import type { BreadcrumbsSettings } from "src/interfaces/settings";
import { BreadcrumbsSettingTab } from "src/settings/SettingsTab";
import { active_file_store } from "src/stores/active_file";
import { MatrixView } from "src/views/matrix";

// TODO: Move this to src/main.ts
export default class BreadcrumbsPlugin extends Plugin {
	settings!: BreadcrumbsSettings;
	graph!: BreadcrumbsGraph;

	async onload() {
		console.log("loading breadcrumbs");
		await this.loadSettings();

		this.addSettingTab(new BreadcrumbsSettingTab(this.app, this));

		// Stores
		active_file_store.set(this.app.workspace.getActiveFile());

		// Events
		this.registerEvent(
			this.app.workspace.on("file-open", async (file) => {
				active_file_store.set(file);
			})
		);

		// NOTE: Build graph _before_ showing any views
		// TESTING
		this.graph = rebuildGraph(this);
		// TESTING

		// Views
		this.registerView(
			VIEW_IDS.matrix,
			(leaf) => new MatrixView(leaf, this)
		);

		/// Redraw any open views, now that the graph is built and views are registered
		// const all_views = this.app.workspace.getLeavesOfType(VIEW_IDS.matrix);

		// all_views.forEach((view) => {
		// 	view.open();
		// });

		// Commands
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
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
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
