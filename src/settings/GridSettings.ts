import type BreadcrumbsPlugin from "src/main";
import { _add_settings_show_node_options } from "./ShowNodeOptions";
import { Setting } from "obsidian";

export const _add_settings_grid_view = (
	plugin: BreadcrumbsPlugin,
	containerEl: HTMLElement,
) => {
	new Setting(containerEl)
		.setName("Enable grid view")
		.setDesc("Show the grid view at the top of the page")
		.addToggle((toggle) => {
			toggle
				.setValue(plugin.settings.views.page.grid.enabled)
				.onChange(async (value) => {
					plugin.settings.views.page.grid.enabled = value;

					await plugin.saveSettings();
					plugin.refresh();
				});
		});

	_add_settings_show_node_options(plugin, containerEl, {
		get: () => plugin.settings.views.page.grid.show_node_options,
		set: (value) =>
			(plugin.settings.views.page.grid.show_node_options = value),
	});
};
