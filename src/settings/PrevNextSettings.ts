import { Setting } from "obsidian";
import FieldGroupLabelsSettingItem from "src/components/settings/FieldGroupLabelsSettingItem.svelte";
import type BreadcrumbsPlugin from "src/main";
import { _add_settings_show_node_options } from "./ShowNodeOptions";
import { mount } from "svelte";

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
					plugin.refreshViews();
				});
		});

	mount(FieldGroupLabelsSettingItem, {
		target: containerEl,
		props: {
			name: "Field Groups for Left",
			description:
				"Select the field groups to show in the left side of this view",
			edge_field_groups: plugin.settings.edge_field_groups,
			field_group_labels:
				plugin.settings.views.page.prev_next.field_group_labels.prev,
			select_cb: async (value: string[]) => {
				plugin.settings.views.page.prev_next.field_group_labels.prev =
					value;

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
			name: "Field Groups for Right",
			description:
				"Select the field groups to show in the right side of this view",
			edge_field_groups: plugin.settings.edge_field_groups,
			field_group_labels:
				plugin.settings.views.page.prev_next.field_group_labels.next,
			select_cb: async (value: string[]) => {
				plugin.settings.views.page.prev_next.field_group_labels.next =
					value;

				await Promise.all([
					plugin.saveSettings(),
					plugin.refreshViews(),
				]);
			},
		},
	});

	_add_settings_show_node_options(plugin, containerEl, {
		get: () => plugin.settings.views.page.prev_next.show_node_options,
		set: (value) =>
			(plugin.settings.views.page.prev_next.show_node_options = value),
	});
};
