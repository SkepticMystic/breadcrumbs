import type BreadcrumbsPlugin from "src/main";
import { get_all_hierarchy_fields } from "src/utils/hierarchies";
import { new_setting } from "src/utils/settings";

export const _add_settings_list_note = (
	plugin: BreadcrumbsPlugin,
	containerEl: HTMLElement,
) => {
	new_setting(containerEl, {
		name: "Default Neighbour Field",
		desc: "Field to use to join neighbouring list items. A common use-case is to use a dir=next field to link items on the same level.",
		select: {
			value: plugin.settings.explicit_edge_sources.date_note
				.default_field,
			options: [""].concat(
				get_all_hierarchy_fields(plugin.settings.hierarchies),
			),
			cb: async (value) => {
				plugin.settings.explicit_edge_sources.date_note.default_field =
					value;
				await Promise.all([plugin.refresh(), plugin.saveSettings()]);
			},
		},
	});
};
