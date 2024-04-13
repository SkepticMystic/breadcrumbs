import EdgeSortIdSettingItem from "src/components/settings/EdgeSortIdSettingItem.svelte";
import { LINK_KINDS } from "src/const/links";
import type BreadcrumbsPlugin from "src/main";
import { new_setting } from "src/utils/settings";
import { _add_settings_show_node_options } from "./ShowNodeOptions";

export const _add_settings_list_index = (
	plugin: BreadcrumbsPlugin,
	contentEl: HTMLElement,
) => {
	const { settings } = plugin;

	// TODO(NODIR): Field selector to contsrain traversal

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

	new EdgeSortIdSettingItem({
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
