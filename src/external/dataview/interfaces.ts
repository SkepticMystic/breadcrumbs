import type { TFile } from "obsidian";

export declare namespace IDataview {
	export type Link = {
		display: string | undefined;
		embed: boolean;
		/** No extension! */
		path: string;
		subpath: string | undefined;
		type: "file";
	};

	export type Page = {
		aliases: string[] | null;
		file: TFile & {
			// NOTE: Other fields are not fully fleshed out.
			// I generally add them as I need
			tags: { values: string[] };
		};
	} & {
		[
			key: string
		]: // Add a type that's _not_ a Link, so that TS shouts if we don't check
		string | Link | Link[];
	};
}
