import type BreadcrumbsPlugin from "src/main";
import { new_setting } from "src/utils/settings";

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
};
