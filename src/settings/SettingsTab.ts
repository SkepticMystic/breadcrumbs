import type BreadcrumbsPlugin from "main";
import { App, PluginSettingTab } from "obsidian";
import HierchySettings from "src/components/HierarchySettings.svelte";

export class BreadcrumbsSettingTab extends PluginSettingTab {
	plugin: BreadcrumbsPlugin;

	constructor(app: App, plugin: BreadcrumbsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new HierchySettings({
			target: containerEl,
			props: { plugin: this.plugin },
		});
	}
}
