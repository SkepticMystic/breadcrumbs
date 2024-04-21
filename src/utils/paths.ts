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

/** Drops .ext, like TFile.basename */
const basename = (path: string) => drop_ext(path.split("/").pop()!);

/** Replace double slashes within the path, and drop leading slashes */
const normalise = (path: string) =>
	path.replace(/\/+/g, "/").replace(/^\//, "");

const build = (
	folder: string,
	basename: string,
	/** _Just_ extname, no period */
	ext: string,
) => ensure_ext(normalise(folder + "/" + basename), ext);

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

	drop_ext,
	drop_folder,

	build,
	normalise,
	show,
};
