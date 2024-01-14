export const ensure_ext = (path: string, ext: string) =>
	path.endsWith(ext) ? path : path + ext;

export const drop_ext = (path: string) => path.replace(/\.[^/.]+$/, "");
