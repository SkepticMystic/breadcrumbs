import "obsidian";

export type FrontmatterPropertyType =
	| "text"
	| "checkbox"
	| "number"
	| "multitext";

// SOURCE: https://github.com/blacksmithgu/obsidian-dataview/blob/master/src/typings/obsidian-ex.d.ts
declare module "obsidian" {
	interface MetadataCache {}

	interface App {
		// https://github.com/chrisgrieser/obsidian-quadro/blob/c456bba7654af5132852e15bd157bf16433057a1/src/shared/utils.ts#L101
		// https://discord.com/channels/686053708261228577/840286264964022302/1224674199642177638
		metadataTypeManager: {
			setType: (
				field: string,
				type: FrontmatterPropertyType,
			) => Promise<void>;
		};
	}

	interface Workspace {}

	interface Editor {}
}

declare global {
	interface Window {
		BCAPI: import("src/api/index").BCAPI;
	}
}
