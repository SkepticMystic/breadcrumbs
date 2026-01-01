import type { App } from "obsidian";
import { Notice } from "obsidian";
import { log } from "src/logger";
import { Links } from "./links";
import { Paths } from "./paths";

/** Try find a given target_path from a source_path. If not found, resolve_to_absolute_path */
export const resolve_relative_target_path = (
	app: App,
	relative_target_path: string,
	source_path: string,
) => {
	const extensioned = Paths.ensure_ext(relative_target_path);

	const target_file = app.metadataCache.getFirstLinkpathDest(
		extensioned,
		source_path,
	);

	const target_path =
		target_file?.path ??
		Links.resolve_to_absolute_path(app, extensioned, source_path);

	return [target_path, target_file] as const;
};

export const copy_to_clipboard = async (
	text: string,
	options?: { notify?: boolean; log?: boolean },
) => {
	const resolved = Object.assign({ notify: true, log: true }, options);

	if (resolved.log) {
		log.feat(text);
	}

	await navigator.clipboard.writeText(text);

	if (resolved.notify) {
		new Notice("Copied to clipboard and logged to console.");
	}
};
