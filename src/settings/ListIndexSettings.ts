import { Setting } from "obsidian";
import EdgeSortIdSelector from "src/components/settings/EdgeSortIdSelector.svelte";
import { DIRECTIONS } from "src/const/hierarchies";
import { LINK_KINDS } from "src/const/links";
import type BreadcrumbsPlugin from "src/main";
import { stringify_hierarchy } from "src/utils/hierarchies";
import { new_setting } from "src/utils/settings";
import { _add_settings_show_node_options } from "./ShowNodeOptions";

export const _add_settings_list_index = (
	plugin: BreadcrumbsPlugin,
	contentEl: HTMLElement,
) => {
	const { settings } = plugin;

	new Setting(contentEl)
		.setName("Hierarchy")
		.setDesc("Optionally constrain the traversal to a specific hierarchy")
		.addDropdown((dropdown) => {
			dropdown.addOption("-1", "All");

			settings.hierarchies.forEach((hierarchy, i) => {
				dropdown.addOption(String(i), stringify_hierarchy(hierarchy));
			});

			dropdown.setValue(
				String(
					settings.commands.list_index.default_options.hierarchy_i,
				),
			);

			dropdown.onChange(async (value) => {
				settings.commands.list_index.default_options.hierarchy_i =
					Number(value);

				await plugin.saveSettings();
			});
		});

	new_setting(contentEl, {
		name: "Direction",
		desc: "Direction to traverse",
		select: {
			options: DIRECTIONS,
			value: settings.commands.list_index.default_options.dir,
			cb: async (value) => {
				settings.commands.list_index.default_options.dir = value;

				await plugin.saveSettings();
			},
		},
	});

	new_setting(contentEl, {
		name: "Link Kind",
		desc: "Format to use for links",
		select: {
			options: LINK_KINDS,
			value: settings.commands.list_index.default_options.link_kind,
			cb: async (value) => {
				settings.commands.list_index.default_options.link_kind = value;

				await plugin.saveSettings();
			},
		},
	});

	new_setting(contentEl, {
		name: "Indent",
		desc: "Indentation to use for each level",
		input: {
			value: settings.commands.list_index.default_options.indent,
			cb: async (value) => {
				settings.commands.list_index.default_options.indent = value;

				await plugin.saveSettings();
			},
		},
	});

	new EdgeSortIdSelector({
		target: contentEl,
		props: {
			edge_sort_id:
				settings.commands.list_index.default_options.edge_sort_id,
		},
	}).$on("select", async (e) => {
		settings.commands.list_index.default_options.edge_sort_id = e.detail;

		await plugin.saveSettings();
	});

	_add_settings_show_node_options(plugin, contentEl, {
		get: () =>
			settings.commands.list_index.default_options.show_node_options,
		set: (value) =>
			(settings.commands.list_index.default_options.show_node_options =
				value),
	});
};
