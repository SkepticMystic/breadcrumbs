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
		file: TFile;
	} & {
		[key: string]: Link | Link[];
	};
}
