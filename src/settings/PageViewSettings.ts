import BreadcrumbsPlugin from "src/main";
import { new_setting } from "src/utils/settings";
import { redraw_page_views } from "src/views/page";

export const _add_settings_page_views = (
	plugin: BreadcrumbsPlugin,
	container_el: HTMLElement,
) => {
	new_setting(container_el, {
		name: "Sticky",
		desc: "Keep the page views pinned to the top of the note as you scroll",
		toggle: {
			value: plugin.settings.views.page.all.sticky,
			cb: async (value) => {
				plugin.settings.views.page.all.sticky = value;

				await plugin.saveSettings();
				redraw_page_views(plugin);
			},
		},
	});

	new_setting(container_el, {
		name: "Readable line width",
		desc: "Limit to the width of the text in the editor",
		toggle: {
			value: plugin.settings.views.page.all.readable_line_width,
			cb: async (value) => {
				plugin.settings.views.page.all.readable_line_width = value;

				await plugin.saveSettings();
				redraw_page_views(plugin);
			},
		},
	});
};
