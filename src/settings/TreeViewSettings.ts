import EdgeSortIdSettingItem from "src/components/settings/EdgeSortIdSettingItem.svelte";
import FieldGroupLabelsSettingItem from "src/components/settings/FieldGroupLabelsSettingItem.svelte";
import type BreadcrumbsPlugin from "src/main";
import { new_setting } from "src/utils/settings";
import ShowAttributesSettingItem from "../components/settings/ShowAttributesSettingItem.svelte";
import { _add_settings_show_node_options } from "./ShowNodeOptions";

export const _add_settings_tree_view = (
	plugin: BreadcrumbsPlugin,
	containerEl: HTMLElement,
) => {
	new_setting(containerEl, {
		name: "Collapse",
		desc: "Collapse the tree by default",
		toggle: {
			value: plugin.settings.views.side.tree.collapse,
			cb: async (checked) => {
				plugin.settings.views.side.tree.collapse = checked;

				await Promise.all([
					plugin.saveSettings(),
					plugin.refreshViews(),
				]);
			},
		},
	});

	new EdgeSortIdSettingItem({
		target: containerEl,
		props: { edge_sort_id: plugin.settings.views.side.tree.edge_sort_id },
	}).$on("select", async (e) => {
		plugin.settings.views.side.tree.edge_sort_id = e.detail;

		await Promise.all([
			plugin.saveSettings(),
			plugin.refreshViews(),
		]);
	});

	new ShowAttributesSettingItem({
		target: containerEl,
		props: {
			show_attributes: plugin.settings.views.side.tree.show_attributes,
		},
	}).$on("select", async (e) => {
		plugin.settings.views.side.tree.show_attributes = e.detail;

		await Promise.all([
			plugin.saveSettings(),
			plugin.refreshViews(),
		]);
	});

	new FieldGroupLabelsSettingItem({
		target: containerEl,
		props: {
			edge_field_groups: plugin.settings.edge_field_groups,
			field_group_labels:
				plugin.settings.views.side.tree.field_group_labels,
		},
	}).$on("select", async (e) => {
		plugin.settings.views.side.tree.field_group_labels = e.detail;

		await Promise.all([
			plugin.saveSettings(),
			plugin.refreshViews(),
		]);
	});

	new_setting(containerEl, {
		name: "Merge Fields",
		desc: "Merge fields in the traversal, instead of keeping their paths separate",
		toggle: {
			value: plugin.settings.views.side.tree.merge_fields,
			cb: async (value) => {
				plugin.settings.views.side.tree.merge_fields = value;

				await Promise.all([
					plugin.saveSettings(),
					plugin.refreshViews(),
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
