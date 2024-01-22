import type { Hierarchy } from "./hierarchies";

export type ShowNodeOptions = {
	ext: boolean;
	folder: boolean;
	alias: boolean;
};

export interface BreadcrumbsSettings {
	hierarchies: Hierarchy[];

	explicit_edge_sources: {
		// Just a regular `up: [[link]]` or `down:: [[link]]` in the content/frontmatter of a note
		// The two are not distinguished, because Dataview doesn't distinguish them
		typed_link: {};
		tag_note: {};
		list_note: {};
		dendron_note: {
			enabled: boolean;
			// Should BC-dendron-note-delimiter be a thing too?
			// With the current setup, it would only apply to a single edge per note
			delimiter: string;
			default_field: string;
			display_trimmed: boolean;
		};
	};

	views: {
		page: {
			/** Constrain max-width to var(--file-line-width) */
			all: {
				readable_line_width: boolean;
			};

			grid: {
				enabled: boolean;
				show_node_options: ShowNodeOptions;
			};
			prev_next: {
				enabled: boolean;
				show_node_options: ShowNodeOptions;
			};
		};
		side: {
			matrix: {
				show_node_options: ShowNodeOptions;
			};
		};
	};
}
