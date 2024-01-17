import { Setting } from "obsidian";
import type { ShowNodeOptions } from "src/interfaces/settings";
import type BreadcrumbsPlugin from "src/main";

export const _add_settings_show_node_options = (
	plugin: BreadcrumbsPlugin,
	containerEl: HTMLElement,
	cb: {
		get: () => ShowNodeOptions;
		set: (value: ShowNodeOptions) => void;
	},
) => {
	let show_node_options = cb.get();

	const setting = new Setting(containerEl)
		.setName("Note display options")
		.setDesc("How to display note links");

	setting.addToggle((toggle) => {
		toggle
			.setTooltip("Folder path")
			.setValue(show_node_options.folder)
			.onChange(async (value) => {
				show_node_options.folder = value;

				cb.set(show_node_options);

				await plugin.saveSettings();
				plugin.refresh();
			});
	});

	setting.addToggle((toggle) => {
		toggle
			.setTooltip("File extension")
			.setValue(show_node_options.ext)
			.onChange(async (value) => {
				show_node_options.ext = value;

				cb.set(show_node_options);

				await plugin.saveSettings();
				plugin.refresh();
			});
	});

	setting.addToggle((toggle) => {
		toggle
			.setTooltip("Alias (first alias, if available)")
			.setValue(show_node_options.alias)
			.onChange(async (value) => {
				show_node_options.alias = value;

				cb.set(show_node_options);

				await plugin.saveSettings();
				plugin.refresh();
			});
	});
};
