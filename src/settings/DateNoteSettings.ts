import { Notice } from "obsidian";
import type BreadcrumbsPlugin from "src/main";
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
				await Promise.all([plugin.rebuildGraph(), plugin.saveSettings()]);
			},
		},
	});

	new_setting(containerEl, {
		name: "Default Field",
		desc: "Field used to join date notes together. Breadcrumbs takes the current note's date, adds one day, and joins the two notes with this field.",
		select: {
			value: plugin.settings.explicit_edge_sources.date_note
				.default_field,
			options: plugin.settings.edge_fields.map((f) => f.label),
			cb: async (value) => {
				plugin.settings.explicit_edge_sources.date_note.default_field =
					value;
				await Promise.all([plugin.rebuildGraph(), plugin.saveSettings()]);
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
						plugin.rebuildGraph(),
						plugin.saveSettings(),
					]);
				}
			},
		},
	});

	new_setting(containerEl, {
		name: "Stretch to Existing",
		desc: "If there is a gap from one day to another, should the next note be the unresolved one in one day or should it 'stretch' to the next resolved (existing) note?",
		toggle: {
			value: plugin.settings.explicit_edge_sources.date_note
				.stretch_to_existing,
			cb: async (value) => {
				plugin.settings.explicit_edge_sources.date_note.stretch_to_existing =
					value;
				await Promise.all([plugin.rebuildGraph(), plugin.saveSettings()]);
			},
		},
	});
};
