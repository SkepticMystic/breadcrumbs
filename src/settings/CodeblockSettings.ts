import type BreadcrumbsPlugin from "src/main";
import { _add_settings_show_node_options } from "./ShowNodeOptions";

export const _add_settings_codeblocks = (
	plugin: BreadcrumbsPlugin,
	containerEl: HTMLElement,
) => {
	_add_settings_show_node_options(plugin, containerEl, {
		get: () => plugin.settings.views.codeblocks.show_node_options,
		set: (value) =>
			(plugin.settings.views.codeblocks.show_node_options = value),
	});
};
