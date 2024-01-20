import type { ShowNodeOptions } from "src/interfaces/settings";
import { ensure_ends_with } from "./strings";

const ensure_ext = (
	path: string,
	/** _Just_ the extension, no '.' */
	ext: string = "md",
) => ensure_ends_with(path, "." + ext);

const drop_ext = (path: string) => path.replace(/\.[^/.]+$/, "");

const drop_folder = (path: string) => path.split("/").pop()!;

/** Pass in which components you want to *keep*, the rest will be dropped */
const show = (
	path: string,
	options?: Partial<Pick<ShowNodeOptions, "ext" | "folder">>,
) => {
	let output = path.slice();

	if (!options?.folder) {
		output = drop_folder(output);
	}

	if (!options?.ext) {
		output = drop_ext(output);
	}

	return output;
};

export const Paths = {
	ensure_ext,

	drop_ext,
	drop_folder,

	show,
};
