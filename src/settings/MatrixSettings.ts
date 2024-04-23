import EdgeSortIdSettingItem from "src/components/settings/EdgeSortIdSettingItem.svelte";
import FieldGroupLabelsSettingItem from "src/components/settings/FieldGroupLabelsSettingItem.svelte";
import ShowAttributesSettingItem from "src/components/settings/ShowAttributesSettingItem.svelte";
import type BreadcrumbsPlugin from "src/main";
import { _add_settings_show_node_options } from "./ShowNodeOptions";

export const _add_settings_matrix = (
	plugin: BreadcrumbsPlugin,
	containerEl: HTMLElement,
) => {
	new EdgeSortIdSettingItem({
		target: containerEl,
		props: { edge_sort_id: plugin.settings.views.side.matrix.edge_sort_id },
	}).$on("select", async (e) => {
		plugin.settings.views.side.matrix.edge_sort_id = e.detail;

		await Promise.all([
			plugin.saveSettings(),
			plugin.refresh({ redraw_side_views: true, rebuild_graph: false }),
		]);
	});

	new ShowAttributesSettingItem({
		target: containerEl,
		props: {
			exclude_attributes: ["field", "explicit"],
			show_attributes: plugin.settings.views.side.matrix.show_attributes,
		},
	}).$on("select", async (e) => {
		plugin.settings.views.side.matrix.show_attributes = e.detail;

		await Promise.all([
			plugin.saveSettings(),
			plugin.refresh({ redraw_side_views: true, rebuild_graph: false }),
		]);
	});

	new FieldGroupLabelsSettingItem({
		target: containerEl,
		props: {
			edge_field_groups: plugin.settings.edge_field_groups,
			field_group_labels:
				plugin.settings.views.side.matrix.field_group_labels,
		},
	}).$on("select", async (e) => {
		plugin.settings.views.side.matrix.field_group_labels = e.detail;

		await Promise.all([
			plugin.saveSettings(),
			plugin.refresh({ redraw_side_views: true, rebuild_graph: false }),
		]);
	});

	_add_settings_show_node_options(plugin, containerEl, {
		get: () => plugin.settings.views.side.matrix.show_node_options,
		set: (value) =>
			(plugin.settings.views.side.matrix.show_node_options = value),
	});
};
