import type BreadcrumbsPlugin from "src/main";
import { get_all_hierarchy_fields } from "src/utils/hierarchies";
import { new_setting } from "src/utils/settings";

export const _add_settings_tag_note = (
	plugin: BreadcrumbsPlugin,
	containerEl: HTMLElement,
) => {
	new_setting(containerEl, {
		name: "Default Field",
		desc: "Field to use if the BC-tag-note-field is not specified",
		select: {
			value: plugin.settings.explicit_edge_sources.tag_note.default_field,
			options: get_all_hierarchy_fields(plugin.settings.hierarchies),
			cb: async (value) => {
				plugin.settings.explicit_edge_sources.tag_note.default_field =
					value;
				await Promise.all([plugin.refresh(), plugin.saveSettings()]);
			},
		},
	});
};
