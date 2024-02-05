import { DIRECTIONS } from "src/const/hierarchies";
import type BreadcrumbsPlugin from "src/main";
import { new_setting } from "src/utils/settings";
import { _add_settings_show_node_options } from "./ShowNodeOptions";

export const _add_settings_tree_view = (
	plugin: BreadcrumbsPlugin,
	containerEl: HTMLElement,
) => {
	new_setting(containerEl, {
		name: "Default Direction",
		desc: "The default direction to use in the tree traversal",
		select: {
			value: plugin.settings.views.side.tree.default_dir,
			options: DIRECTIONS,
			cb: async (value) => {
				plugin.settings.views.side.tree.default_dir = value;

				await Promise.all([
					plugin.saveSettings(),
					plugin.refresh({ rebuild_graph: false }),
				]);
			},
		},
	});

	_add_settings_show_node_options(plugin, containerEl, {
		get: () => plugin.settings.views.side.tree.show_node_options,
		set: (value) =>
			(plugin.settings.views.side.tree.show_node_options = value),
	});
};
