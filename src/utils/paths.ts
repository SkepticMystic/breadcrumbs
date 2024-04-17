import type { ShowNodeOptions } from "src/interfaces/settings";
import { ensure_ends_with, ensure_not_starts_with } from "./strings";

const ensure_ext = (
	path: string,
	/** _Just_ the extension, no '.' */
	ext: string = "md",
) => ensure_ends_with(path, "." + ext);

const drop_ext = (path: string) => path.replace(/\.[^.]+$/, "");

const extname = (path: string) => path.split(".").pop()!;

const drop_folder = (path: string) => path.split("/").pop()!;

const dirname = (path: string) => path.split("/").slice(0, -1).join("/");

/** Keeps .ext */
const basename = (path: string) => path.split("/").pop()!;

const join = (...paths: string[]) =>
	ensure_not_starts_with(paths.join("/").replace(/\/+/g, "/"), "/");

const build = (
	folder: string,
	basename: string,
	/** _Just_ extname, no period */
	ext: string,
) => ensure_ext(join(folder, basename), ext);

const normalise = (path: string) =>
	path.replace(/\/+/g, "/").replace(/^\//, "");

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
	dirname,

	// update_name,

	drop_ext,
	drop_folder,

	join,
	build,
	normalise,
	show,
};
