import type { ShowNodeOptions } from "src/interfaces/settings";
import { ensure_ends_with } from "./strings";
import { log } from "src/logger";

function ensure_ext(
	path: string,
	/** _Just_ the extension, no '.' */
	ext: string = "md",
) {
	if (extname(path) ==="base") {
		log.debug("ensure_ext > already has base", { path });
		return path;
	}
	log.debug("ensure_ext > adding ext", { path: path + " ext: " + ext });
	return ensure_ends_with(path, "." + ext);
}

function drop_ext(path: string) {
	if (extname(path) === "base") {
		log.debug("normalize > path is base, returning as-is", { path });
		return path;
	}
	return path.replace(/\.[^.]+$/, "");
}

function extname(path: string) {
	return path.split(".").pop()!;
}

function drop_folder(path: string) {
	return path.split("/").pop()!;
}

function dirname(path: string) {
	return path.split("/").slice(0, -1).join("/");
}

/** Drops .ext, like TFile.basename */
function basename(path: string) {
	return drop_ext(path.split("/").pop()!);
}

/** Replace double slashes within the path, and drop leading slashes */
function normalize(path: string) {
	return path.replace(/\/+/g, "/").replace(/^\//, "");
}

function build(
	folder: string,
	basename: string,
	/** _Just_ extname, no period */
	ext: string,
) {
	return ensure_ext(normalize(folder + "/" + basename), ext);
}

/** Pass in which components you want to *keep*, the rest will be dropped */
function show(
	path: string,
	show_node_options?: Partial<Pick<ShowNodeOptions, "ext" | "folder">>,
) {
	let output = path.slice();

	if (!show_node_options?.folder) {
		output = drop_folder(output);
	}

	if (!show_node_options?.ext) {
		output = drop_ext(output);
	}

	return output;
}

export const Paths = {
	ensure_ext,

	extname,
	basename,
	dirname,

	drop_ext,
	drop_folder,

	build,
	normalize,
	show,
};
