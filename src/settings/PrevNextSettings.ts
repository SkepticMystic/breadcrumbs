import { Setting } from "obsidian";
import FieldGroupLabelsSettingItem from "src/components/settings/FieldGroupLabelsSettingItem.svelte";
import type BreadcrumbsPlugin from "src/main";
import { _add_settings_show_node_options } from "./ShowNodeOptions";

export const _add_settings_prev_next_view = (
	plugin: BreadcrumbsPlugin,
	containerEl: HTMLElement,
) => {
	new Setting(containerEl)
		.setName("Enable Previous/Next view")
		.setDesc("Show the Previous/Next view at the top of the page")
		.addToggle((toggle) => {
			toggle
				.setValue(plugin.settings.views.page.prev_next.enabled)
				.onChange(async (value) => {
					plugin.settings.views.page.prev_next.enabled = value;

					await Promise.all([plugin.saveSettings()]);
					// Don't await if not rebuilding the graph
					plugin.refresh({
						rebuild_graph: false,
						active_file_store: false,
					});
				});
		});

	new FieldGroupLabelsSettingItem({
		target: containerEl,
		props: {
			name: "Field Groups for Left",
			description:
				"Select the field groups to show in the left side of this view",
			edge_field_groups: plugin.settings.edge_field_groups,
			field_group_labels:
				plugin.settings.views.page.prev_next.field_group_labels.prev,
		},
	}).$on("select", async (e) => {
		plugin.settings.views.page.prev_next.field_group_labels.prev = e.detail;

		await Promise.all([
			plugin.saveSettings(),
			plugin.refresh({ rebuild_graph: false }),
		]);
	});

	new FieldGroupLabelsSettingItem({
		target: containerEl,
		props: {
			name: "Field Groups for Right",
			description:
				"Select the field groups to show in the right side of this view",
			edge_field_groups: plugin.settings.edge_field_groups,
			field_group_labels:
				plugin.settings.views.page.prev_next.field_group_labels.next,
		},
	}).$on("select", async (e) => {
		plugin.settings.views.page.prev_next.field_group_labels.next = e.detail;

		await Promise.all([
			plugin.saveSettings(),
			plugin.refresh({ rebuild_graph: false }),
		]);
	});

	_add_settings_show_node_options(plugin, containerEl, {
		get: () => plugin.settings.views.page.prev_next.show_node_options,
		set: (value) =>
			(plugin.settings.views.page.prev_next.show_node_options = value),
	});
};
