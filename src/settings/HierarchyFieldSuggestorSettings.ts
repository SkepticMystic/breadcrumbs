import { Notice } from "obsidian";
import type BreadcrumbsPlugin from "src/main";
import { new_setting } from "src/utils/settings";

export const _add_settings_hierarchy_field_suggestor = (
	plugin: BreadcrumbsPlugin,
	contentEl: HTMLElement,
) => {
	const { settings } = plugin;

	new_setting(contentEl, {
		name: "Enabled",
		desc: "Whether to enable the hierarchy field suggestor",
		toggle: {
			value: settings.suggestors.hierarchy_field.enabled,
			cb: async (value) => {
				settings.suggestors.hierarchy_field.enabled = value;

				if (value) {
					new Notice(
						"Please restart Obsidian for the changes to take effect",
					);
				}

				await plugin.saveSettings();
			},
		},
	});

	new_setting(contentEl, {
		name: "Trigger String",
		desc: "The string that triggers the suggestor (when entered at the start of a line)",
		input: {
			value: settings.suggestors.hierarchy_field.trigger,
			cb: async (value) => {
				if (!value) {
					new Notice("Trigger string cannot be empty");
					return;
				}

				settings.suggestors.hierarchy_field.trigger = value;

				await plugin.saveSettings();
			},
		},
	});
};
