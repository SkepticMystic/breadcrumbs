import { Notice } from "obsidian";
import type BreadcrumbsPlugin from "src/main";
import { get_all_hierarchy_fields } from "src/utils/hierarchies";
import { new_setting } from "src/utils/settings";

export const _add_settings_date_note = (
	plugin: BreadcrumbsPlugin,
	containerEl: HTMLElement,
) => {
	new_setting(containerEl, {
		name: "Enabled",
		desc: "Look for date notes to use as edge sources",
		toggle: {
			value: plugin.settings.explicit_edge_sources.date_note.enabled,
			cb: async (value) => {
				plugin.settings.explicit_edge_sources.date_note.enabled = value;
				await Promise.all([plugin.refresh(), plugin.saveSettings()]);
			},
		},
	});

	new_setting(containerEl, {
		name: "Default Field",
		desc: "Field to use to join date notes together",
		select: {
			value: plugin.settings.explicit_edge_sources.date_note
				.default_field,
			options: get_all_hierarchy_fields(plugin.settings.hierarchies),
			cb: async (value) => {
				plugin.settings.explicit_edge_sources.date_note.default_field =
					value;
				await Promise.all([plugin.refresh(), plugin.saveSettings()]);
			},
		},
	});

	const date_format_fragment = new DocumentFragment();
	date_format_fragment.createEl(
		"span",
		{},
		(el) =>
			(el.innerHTML = `<a href="https://moment.github.io/luxon/#/formatting?id=table-of-tokens">Luxon date format</a> to use`),
	);

	new_setting(containerEl, {
		name: "Date Format",
		desc: date_format_fragment,
		input: {
			value: plugin.settings.explicit_edge_sources.date_note.date_format,
			cb: async (value) => {
				if (!value) new Notice("Date format cannot be empty");
				else {
					plugin.settings.explicit_edge_sources.date_note.date_format =
						value;
					await Promise.all([
						plugin.refresh(),
						plugin.saveSettings(),
					]);
				}
			},
		},
	});
};
