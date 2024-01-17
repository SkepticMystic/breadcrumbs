import type { App } from "obsidian";
import path from "path";

/** Given an unresolved link path, return the absolute path of where it _would_ get created,
 * given the file it would be created in
 */
const resolve_to_absolute_path = (
	app: App,
	relative_path: string,
	/** The file the unresolved link is in/being created from */
	source_path: string,
) => {
	const folder = app.fileManager.getNewFileParent(source_path, relative_path);

	return path.join(folder.path, path.basename(relative_path));
};

export const Link = {
	resolve_to_absolute_path,
};
