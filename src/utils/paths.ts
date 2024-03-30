import { normalizePath } from "obsidian";
import type { ShowNodeOptions } from "src/interfaces/settings";
import { ensure_ends_with } from "./strings";

const ensure_ext = (
	path: string,
	/** _Just_ the extension, no '.' */
	ext: string = "md",
) => ensure_ends_with(path, "." + ext);

const drop_ext = (path: string) => path.replace(/\.[^/.]+$/, "");

const extname = (path: string) => path.split(".").pop()!;

const drop_folder = (path: string) => path.split("/").pop()!;

const basename = (path: string) => path.split("/").pop()!;

const join = (...paths: string[]) => normalizePath(paths.join("/"));

// const update_name = (
// 	path_str: string,
// 	callback: (basename: string) => string,
// ) => {
// 	const { dir, ext, name } = path.parse(path_str);

// 	return path.join(dir, callback(name) + ext);
// };

/** Pass in which components you want to *keep*, the rest will be dropped */
const show = (
	path: string,
	show_node_options?: Partial<Pick<ShowNodeOptions, "ext" | "folder">>,
) => {
	let output = path.slice();

	if (!show_node_options?.folder) {
		output = drop_folder(output);
	}

	if (!show_node_options?.ext) {
		output = drop_ext(output);
	}

	return output;
};

export const Paths = {
	ensure_ext,
	extname,
	basename,

	// update_name,

	drop_ext,
	drop_folder,

	join,
	show,
};
