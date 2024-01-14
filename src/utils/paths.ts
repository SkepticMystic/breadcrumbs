export const ensure_ext = (path: string, ext: string) =>
	path.endsWith(ext) ? path : path + ext;

export const drop_ext = (path: string) => path.replace(/\.[^/.]+$/, "");

export const drop_folder = (path: string) => path.split("/").pop()!;

export const drop_folder_ext = (path: string) => drop_ext(drop_folder(path));
