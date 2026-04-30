import type {App, CachedMetadata} from "obsidian";
import { TFile   } from "obsidian";
import type { IDataview } from "src/external/dataview/interfaces";

interface TFileWithCache {
	file: TFile;
	cache: CachedMetadata | null;
}

/**
 * Collect markdown notes from the vault for graph rebuild.
 *
 * `getMarkdownFiles()` is normally authoritative; if it is empty while the vault
 * already has files (startup / indexing race; see Obsidian API FAQ), fall back
 * to `getFiles()` so explicit builders (Dendron, JD, etc.) still run.
 */
function collect_markdown_files(app: App): TFile[] {
	const from_index = app.vault.getMarkdownFiles();
	if (from_index.length > 0) return from_index;

	return app.vault
		.getFiles()
		.filter((f): f is TFile => f instanceof TFile && f.extension === "md");
}

/**
 * Files passed to graph rebuild.
 *
 * We always use Obsidian’s vault list plus `metadataCache` for each file.
 * Historically, when Dataview was enabled we used `dataview.api.pages().values`
 * instead; that list comes from Dataview’s index and API, which changed across
 * versions (0.4 → 0.5) and can omit markdown notes the graph still needs, so
 * views like the tree could miss edges. Dataview remains used elsewhere (e.g.
 * `dataview-from` in codeblocks) via `dataview_plugin.get_api()`.
 *
 * `dataview` is always `null` here; optional `all_files.dataview?.forEach` in
 * builders remains a no-op. The old dual-source shape is not used for rebuild.
 */
export interface AllFiles {
	obsidian: TFileWithCache[];
	/** Not populated during rebuild; optional Dataview page list for legacy branches. */
	dataview: IDataview.Page[] | null;
}

export const get_all_files = (app: App): AllFiles => ({
	obsidian: collect_markdown_files(app).map((file) => ({
		file,
		cache: app.metadataCache.getFileCache(file),
	})),
	dataview: null,
});
