import type { App } from "obsidian";
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
