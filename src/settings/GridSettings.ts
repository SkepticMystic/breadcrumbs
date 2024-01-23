import type BreadcrumbsPlugin from "src/main";
import { new_setting } from "src/utils/settings";
import { _add_settings_show_node_options } from "./ShowNodeOptions";

export const _add_settings_grid_view = (
	plugin: BreadcrumbsPlugin,
	containerEl: HTMLElement,
) => {
	new_setting(containerEl, {
		name: "Enable grid view",
		desc: "Show the grid view at the top of the page",
		toggle: {
			value: plugin.settings.views.page.grid.enabled,
			cb: async (value) => {
				plugin.settings.views.page.grid.enabled = value;
				await plugin.saveSettings();
				plugin.refresh({ rebuild_graph: false });
			},
		},
	});

	_add_settings_show_node_options(plugin, containerEl, {
		get: () => plugin.settings.views.page.grid.show_node_options,
		set: (value) =>
			(plugin.settings.views.page.grid.show_node_options = value),
	});
};
