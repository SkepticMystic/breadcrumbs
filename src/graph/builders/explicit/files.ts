import type { App, CachedMetadata, TFile } from "obsidian";
import { dataview_plugin } from "src/external/dataview";
import type { IDataview } from "src/external/dataview/interfaces";

interface TFileWithCache {
	file: TFile;
	cache: CachedMetadata | null;
}

/** If Dataview is enabled, we'll use their index. If not, fallback to Obsidian */
export type AllFiles =
	| { obsidian: TFileWithCache[]; dataview: null }
	| { obsidian: null; dataview: IDataview.Page[] };

export const get_all_files = (app: App): AllFiles => {
	if (dataview_plugin.is_enabled(app)) {
		return {
			obsidian: null,
			// eslint-disable-next-line
			dataview: dataview_plugin.get_api()?.pages().values,
		};
	} else {
		return {
			obsidian: app.vault.getMarkdownFiles().map((file) => ({
				file,
				cache: app.metadataCache.getFileCache(file),
			})),
			dataview: null,
		};
	}
};
