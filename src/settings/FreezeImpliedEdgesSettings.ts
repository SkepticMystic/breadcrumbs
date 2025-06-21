import type BreadcrumbsPlugin from "src/main";
import { new_setting } from "src/utils/settings";
import FieldGroupLabelsSettingItem from "src/components/settings/FieldGroupLabelsSettingItem.svelte";

export const _add_settings_freeze_implied_edges = (
	plugin: BreadcrumbsPlugin,
	contentEl: HTMLElement,
) => {
	const { settings } = plugin;

	new_setting(contentEl, {
		name: "Destination",
		desc: "Where to write the frozen edges to",
		select: {
			options: ["frontmatter", "dataview-inline"],
			value: settings.commands.freeze_implied_edges.default_options
				.destination,
			cb: async (value) => {
				settings.commands.freeze_implied_edges.default_options.destination =
					value;

				await plugin.saveSettings();
			},
		},
	});

	new FieldGroupLabelsSettingItem({
		target: contentEl,
		props: {
			name: "Included Field Groups",
			description:
				"Field groups to include when freezing implied edges. Leave empty to include all field groups.",
			edge_field_groups: plugin.settings.edge_field_groups,
			field_group_labels: settings.commands.freeze_implied_edges.default_options.included_fields,
		},
	}).$on("select", async (e) => {
		settings.commands.freeze_implied_edges.default_options.included_fields = e.detail;

		await Promise.all([
			plugin.saveSettings(),
			plugin.refresh({ rebuild_graph: false }),
		]);
	});

	new_setting(contentEl, {
		name: "Use Alias",
		desc: "Freeze implied edges using the first alias of the target node.",
		toggle: {
			value: settings.commands.freeze_implied_edges.default_options.use_alias,
			cb: async (checked) => {
				settings.commands.freeze_implied_edges.default_options.use_alias = checked;

				await Promise.all([
					plugin.saveSettings(),
					plugin.refresh({
						redraw_side_views: true,
						redraw_page_views: false,
						redraw_codeblocks: false,
						rebuild_graph: false,
					}),
				]);
			},
		},
	});
};
