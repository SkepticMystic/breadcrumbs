import { App, PluginSettingTab } from "obsidian";
import type BreadcrumbsPlugin from "src/main";
import { _add_settings_grid_view } from "./GridSettings";
import { _add_settings_hierarchies } from "./HierarchySettings";
import { _add_settings_matrix } from "./MatrixSettings";

const make_details_el = (text: string, parent: HTMLElement) =>
	parent.createEl("details", {}, (d) => d.createEl("summary", { text }));

export class BreadcrumbsSettingTab extends PluginSettingTab {
	plugin: BreadcrumbsPlugin;

	constructor(app: App, plugin: BreadcrumbsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h1", { text: "Breadcrumbs Settings" });
		containerEl.addClass("BC-settings-tab");

		containerEl.createEl("h2", { text: "Hierarchies" });
		_add_settings_hierarchies(this.plugin, containerEl);

		// Views
		containerEl.createEl("h2", { text: "Views" });

		_add_settings_matrix(
			this.plugin,
			make_details_el("Matrix", containerEl),
		);

		_add_settings_grid_view(
			this.plugin,
			make_details_el("Grid", containerEl),
		);
	}
}
