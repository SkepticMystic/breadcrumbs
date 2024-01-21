import { Setting } from "obsidian";
import type BreadcrumbsPlugin from "src/main";
import { _add_settings_show_node_options } from "./ShowNodeOptions";

export const _add_settings_prev_next_view = (
	plugin: BreadcrumbsPlugin,
	containerEl: HTMLElement,
) => {
	new Setting(containerEl)
		.setName("Enable Previous/Next view")
		.setDesc("Show the Previous/Next view at the top of the page")
		.addToggle((toggle) => {
			toggle
				.setValue(plugin.settings.views.page.prev_next.enabled)
				.onChange(async (value) => {
					plugin.settings.views.page.prev_next.enabled = value;

					await plugin.saveSettings();
					plugin.refresh({
						rebuild_graph: false,
						active_file_store: false,
					});
				});
		});

	_add_settings_show_node_options(plugin, containerEl, {
		get: () => plugin.settings.views.page.prev_next.show_node_options,
		set: (value) =>
			(plugin.settings.views.page.prev_next.show_node_options = value),
	});
};
