import type BreadcrumbsPlugin from "src/main";
import { new_setting } from "src/utils/settings";
import { _add_settings_show_node_options } from "./ShowNodeOptions";
import { Notice } from "obsidian";

export const _add_settings_trail_view = (
	plugin: BreadcrumbsPlugin,
	containerEl: HTMLElement,
) => {
	new_setting(containerEl, {
		name: "Enable trail view",
		desc: "Show the trail view at the top of the page",
		toggle: {
			value: plugin.settings.views.page.trail.enabled,
			cb: async (value) => {
				plugin.settings.views.page.trail.enabled = value;

				await Promise.all([plugin.saveSettings()]);
				// Don't await if not rebuilding the graph
				plugin.refresh({ rebuild_graph: false });
			},
		},
	});

	new_setting(containerEl, {
		name: "Format",
		desc: "Format of the trail view",
		select: {
			value: plugin.settings.views.page.trail.format,
			options: ["grid", "path"],
			cb: async (value) => {
				plugin.settings.views.page.trail.format = value;

				await Promise.all([plugin.saveSettings()]);
				plugin.refresh({ rebuild_graph: false });
			},
		},
	});

	new_setting(containerEl, {
		name: "Path Selection",
		desc: "How to select the path(s) to display in the trail view",
		select: {
			value: plugin.settings.views.page.trail.selection,
			options: ["all", "shortest", "longest"],
			cb: async (value) => {
				plugin.settings.views.page.trail.selection = value;

				await Promise.all([plugin.saveSettings()]);
				plugin.refresh({ rebuild_graph: false });
			},
		},
	});

	new_setting(containerEl, {
		name: "Default depth",
		desc: "Default depth of the trail view",
		input: {
			value: plugin.settings.views.page.trail.default_depth.toString(),
			cb: async (value) => {
				const int = parseInt(value);
				if (isNaN(int)) {
					return new Notice("Depth must be a number");
				} else if (int < 0) {
					return new Notice("Depth must be a non-negative number");
				}

				plugin.settings.views.page.trail.default_depth = int;

				await Promise.all([plugin.saveSettings()]);
				plugin.refresh({ rebuild_graph: false });
			},
		},
	});

	new_setting(containerEl, {
		name: "Show controls",
		desc: "Show controls to change the depth/format/path-selection of the trail view",
		toggle: {
			value: plugin.settings.views.page.trail.show_controls,
			cb: async (value) => {
				plugin.settings.views.page.trail.show_controls = value;

				await Promise.all([plugin.saveSettings()]);
				plugin.refresh({ rebuild_graph: false });
			},
		},
	});

	new_setting(containerEl, {
		name: "No path message",
		desc: "Message to display when there is no path to display. Leave blank to hide the trail view when there is no path.",
		input: {
			value: plugin.settings.views.page.trail.no_path_message,
			cb: async (value) => {
				plugin.settings.views.page.trail.no_path_message = value;

				await Promise.all([plugin.saveSettings()]);
				plugin.refresh({ rebuild_graph: false });
			},
		},
	});

	_add_settings_show_node_options(plugin, containerEl, {
		get: () => plugin.settings.views.page.trail.show_node_options,
		set: (value) =>
			(plugin.settings.views.page.trail.show_node_options = value),
	});
};
