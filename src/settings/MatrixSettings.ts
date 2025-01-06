import EdgeSortIdSettingItem from "src/components/settings/EdgeSortIdSettingItem.svelte";
import FieldGroupLabelsSettingItem from "src/components/settings/FieldGroupLabelsSettingItem.svelte";
import ShowAttributesSettingItem from "src/components/settings/ShowAttributesSettingItem.svelte";
import type BreadcrumbsPlugin from "src/main";
import { _add_settings_show_node_options } from "./ShowNodeOptions";
import { new_setting } from "src/utils/settings";
import { mount } from "svelte";
import type { EdgeAttribute } from "src/graph/utils";
import type { EdgeSortId } from "src/const/graph";

export const _add_settings_matrix = (
	plugin: BreadcrumbsPlugin,
	containerEl: HTMLElement,
) => {
	new_setting(containerEl, {
		name: "Collapse",
		desc: "Collapse the matrix by default",
		toggle: {
			value: plugin.settings.views.side.matrix.collapse,
			cb: async (checked) => {
				plugin.settings.views.side.matrix.collapse = checked;

				await Promise.all([
					plugin.saveSettings(),
					plugin.refreshViews(),
				]);
			},
		},
	});

	mount(EdgeSortIdSettingItem, {
		target: containerEl,
		props: {
			edge_sort_id: plugin.settings.views.side.matrix.edge_sort_id,
			select_cb: async (value: EdgeSortId) => {
				plugin.settings.views.side.matrix.edge_sort_id = value;

				await Promise.all([
					plugin.saveSettings(),
					plugin.refreshViews(),
				]);
			},
		},
	});

	mount(ShowAttributesSettingItem, {
		target: containerEl,
		props: {
			exclude_attributes: ["field", "explicit"],
			show_attributes: plugin.settings.views.side.matrix.show_attributes,
			select_cb: async (value: EdgeAttribute[]) => {
				plugin.settings.views.side.matrix.show_attributes = value;

				await Promise.all([
					plugin.saveSettings(),
					plugin.refreshViews(),
				]);
			},
		},
	});

	mount(FieldGroupLabelsSettingItem, {
		target: containerEl,
		props: {
			edge_field_groups: plugin.settings.edge_field_groups,
			field_group_labels:
				plugin.settings.views.side.matrix.field_group_labels,
			select_cb: async (value: string[]) => {
				plugin.settings.views.side.matrix.field_group_labels = value;

				await Promise.all([
					plugin.saveSettings(),
					plugin.refreshViews(),
				]);
			},
		},
	});

	_add_settings_show_node_options(plugin, containerEl, {
		get: () => plugin.settings.views.side.matrix.show_node_options,
		set: (value) =>
			(plugin.settings.views.side.matrix.show_node_options = value),
	});
};
