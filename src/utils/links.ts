import type { App } from "obsidian";
import path from "path";

const relative_to_absolute = (
	app: App,
	relative_path: string,
	current_path: string,
) => {
	const folder = app.fileManager.getNewFileParent(
		current_path,
		relative_path,
	);

	return path.join(folder.path, relative_path);
};

export const Link = {
	relative_to_absolute,
};
