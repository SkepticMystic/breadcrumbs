import "obsidian";

// SOURCE: https://github.com/blacksmithgu/obsidian-dataview/blob/master/src/typings/obsidian-ex.d.ts
declare module "obsidian" {
	interface MetadataCache {}

	interface App {}

	interface Workspace {}

	interface Editor {}
}

declare global {
	interface Window {
		BCAPI: import("src/api/index").BCAPI;
	}
}
