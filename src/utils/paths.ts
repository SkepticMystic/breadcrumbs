import type { PathKeepOptions } from "src/interfaces/settings";

const ensure_ext = (path: string, ext: string) =>
	path.endsWith(ext) ? path : path + ext;

const drop_ext = (path: string) => path.replace(/\.[^/.]+$/, "");

const drop_folder = (path: string) => path.split("/").pop()!;

/** Pass in which components you want to *keep*, the rest will be dropped */
const keep = (path: string, options?: Partial<PathKeepOptions>) => {
	let output = path.slice();

	if (!options?.folder) {
		output = drop_folder(output);
	}

	if (!options?.ext) {
		output = drop_ext(output);
	}

	return output;
};

export const Path = {
	ensure_ext,

	drop_ext,
	drop_folder,

	keep,
};
