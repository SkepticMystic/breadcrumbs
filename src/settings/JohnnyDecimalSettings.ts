import { Notice } from "obsidian";
import type BreadcrumbsPlugin from "src/main";
import { new_setting } from "src/utils/settings";

export const _add_settings_johnny_decimal_note = (
	plugin: BreadcrumbsPlugin,
	containerEl: HTMLElement,
) => {
	new_setting(containerEl, {
		name: "Enabled",
		desc: "Look for Johnny Decimal notes to use as edge sources",
		toggle: {
			value: plugin.settings.explicit_edge_sources.johnny_decimal_note
				.enabled,
			cb: async (value) => {
				plugin.settings.explicit_edge_sources.johnny_decimal_note.enabled =
					value;
				await Promise.all([plugin.rebuildGraph(), plugin.saveSettings()]);
			},
		},
	});

	new_setting(containerEl, {
		name: "Delimiter",
		desc: "Delimiter to use to split the note name",
		input: {
			value: plugin.settings.explicit_edge_sources.johnny_decimal_note
				.delimiter,
			cb: async (value) => {
				if (!value) new Notice("Delimiter cannot be empty");
				else {
					plugin.settings.explicit_edge_sources.johnny_decimal_note.delimiter =
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
		name: "Default Field",
		desc: "Field to use to point to next note in the Johnny Decimal system",
		select: {
			value: plugin.settings.explicit_edge_sources.johnny_decimal_note
				.default_field,
			options: plugin.settings.edge_fields.map((f) => f.label),
			cb: async (value) => {
				plugin.settings.explicit_edge_sources.johnny_decimal_note.default_field =
					value;
				await Promise.all([plugin.rebuildGraph(), plugin.saveSettings()]);
			},
		},
	});
};
