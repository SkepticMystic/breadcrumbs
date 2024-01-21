import { Setting } from "obsidian";
import BreadcrumbsPlugin from "src/main";

export const _add_settings_page_views = (
	plugin: BreadcrumbsPlugin,
	container_el: HTMLElement,
) => {
	new Setting(container_el)
		.setName("Readable line width")
		.setDesc("Limit to the width of the text in the editor")
		.addToggle((toggle) => {
			toggle
				.setValue(plugin.settings.views.page.all.readable_line_width)
				.onChange(async (value) => {
					plugin.settings.views.page.all.readable_line_width = value;

					await plugin.saveSettings();
					plugin.refresh({
						rebuild_graph: false,
						active_file_store: false,
					});
				});
		});
};
