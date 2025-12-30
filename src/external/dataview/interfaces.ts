import type { Pos } from "obsidian";

// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace IDataview {
	export interface Link {
		display: string | undefined;
		embed: boolean;
		/** No extension! */
		path: string;
		subpath: string | undefined;
		type: "file";
	}

	/** Dataview Proxy wrapper, usually around an array of things */
	interface Proxy<T> {
		values: T[];
	}

	// NOTE: Not _all_ fields, but seemingly enough to do list_notes
	interface NoteList {
		annotated: boolean;
		children: NoteList[];
		/** Seems to be what's needed for list_notes
		 * I think it represents the Links in that particular list _item_
		 * e.g. "- [[foo]]" would have a single Link to foo
		 */
		outlinks: Link[];

		/** The raw list item text (without the list symbol, "-", for example) */
		text: string;

		position: Pos;
	}

	export type Page = {
		file: {
			// NOTE: Other fields are not fully fleshed out.
			// I generally add them as I need
			ext: string;
			folder: string;
			/** What Obisidian calls 'basename' */
			name: string;
			path: string;

			frontmatter: Record<string, unknown>;

			aliases: Proxy<string>;

			/** Possibly misleading name. I interpret it as lall list_items ("- item") in a note
			 * The children property makes it recursable, but I'm using it as a flat structure
			 */
			lists: Proxy<NoteList>;

			/** The not-unwound equivalent of `tags` */
			etags: Proxy<string>;
			/** WARN: Not just a list of tags in the note. This list contains unwound nested tags.
			 * e.g. if a note has #foo/bar, this list will contain #foo and #foo/bar
			 */
			tags: Proxy<string>;
		};
	} & Record<string, string | Link | Link[] | null>;
}
