import EdgeSortIdSettingItem from "src/components/settings/EdgeSortIdSettingItem.svelte";
import FieldGroupLabelsSettingItem from "src/components/settings/FieldGroupLabelsSettingItem.svelte";
import ShowAttributesSettingItem from "src/components/settings/ShowAttributesSettingItem.svelte";
import { LINK_KINDS } from "src/const/links";
import type BreadcrumbsPlugin from "src/main";
import { resolve_field_group_labels } from "src/utils/edge_fields";
import { new_setting } from "src/utils/settings";
import { _add_settings_show_node_options } from "./ShowNodeOptions";

export const _add_settings_list_index = (
	plugin: BreadcrumbsPlugin,
	contentEl: HTMLElement,
) => {
	const { settings } = plugin;

	new FieldGroupLabelsSettingItem({
		target: contentEl,
		props: {
			edge_field_groups: plugin.settings.edge_field_groups,
			field_group_labels:
				settings.commands.list_index.default_options.field_group_labels,
		},
	}).$on("select", async (e) => {
		// Tracking groups for the UI
		settings.commands.list_index.default_options.field_group_labels =
			e.detail;

		// Settings fields for the build call
		settings.commands.list_index.default_options.fields =
			resolve_field_group_labels(
				plugin.settings.edge_field_groups,
				settings.commands.list_index.default_options.field_group_labels,
			);

		await plugin.saveSettings();
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

	new ShowAttributesSettingItem({
		target: contentEl,
		props: {
			show_attributes:
				settings.commands.list_index.default_options.show_attributes,
		},
	}).$on("select", async (e) => {
		settings.commands.list_index.default_options.show_attributes = e.detail;

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
