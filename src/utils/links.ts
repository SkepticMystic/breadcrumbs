import type { App } from "obsidian";
import type { LinkKind } from "src/interfaces/links";
import { Paths } from "./paths";

// TODO: Something seems wrong here... a new note was created in the root of the vault,
//       even though it used a full path in the link content
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

	return Paths.join(
		folder.path === "/" ? "" : folder.path,
		Paths.basename(relative_path),
	);
};

// TODO: Should I be using app.fileManager.generateMarkdownLink here?
//   I don't think it does 'markdown' links, but use it for wiki
const ify = (
	path: string,
	display: string,
	{
		link_kind,
	}: {
		link_kind: LinkKind;
	},
) => {
	switch (link_kind) {
		case "none": {
			return display;
		}
		case "wiki": {
			return display === path ? `[[${path}]]` : `[[${path}|${display}]]`;
		}
		case "markdown": {
			return display === path
				? `[${path}](${path})`
				: `[${display}](${path})`;
		}
	}
};

export const Links = {
	ify,
	resolve_to_absolute_path,
};
