import { App, PluginSettingTab } from "obsidian";
import type BreadcrumbsPlugin from "src/main";
import { _add_settings_hierarchies } from "./HierarchySettings";
import { _add_settings_matrix } from "./MatrixSettings";

export class BreadcrumbsSettingTab extends PluginSettingTab {
	plugin: BreadcrumbsPlugin;

	constructor(app: App, plugin: BreadcrumbsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		_add_settings_hierarchies(this.plugin, containerEl);
		_add_settings_matrix(this.plugin, containerEl);
	}
}
