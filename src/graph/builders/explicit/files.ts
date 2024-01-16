import type { App, TFile } from "obsidian";
import { dataview_plugin } from "src/external/dataview";
import type { IDataview } from "src/external/dataview/interfaces";

export type ObsidianOrDataviewFiles =
	| [TFile[], null]
	| [null, IDataview.Page[]];

export const get_obsidian_or_dataview_files = (
	app: App,
): ObsidianOrDataviewFiles => {
	if (dataview_plugin.is_enabled(app)) {
		return [null, dataview_plugin.get_api()?.pages().values];
	} else {
		return [app.vault.getMarkdownFiles(), null];
	}
};
