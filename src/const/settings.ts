import { ListIndex } from "src/commands/list_index";
import type { BreadcrumbsSettings } from "src/interfaces/settings";
import { blank_hierarchy } from "src/utils/hierarchies";

export const DEFAULT_SETTINGS: BreadcrumbsSettings = {
	hierarchies: [
		{
			dirs: {
				up: ["up"],
				same: ["same"],
				down: ["down"],
				next: ["next"],
				prev: ["prev"],
			},
			implied_relationships: blank_hierarchy().implied_relationships,
		},
	],

	explicit_edge_sources: {
		list_note: {},
		typed_link: {},
		tag_note: {
			default_field: "up",
		},
		dendron_note: {
			enabled: false,
			delimiter: ".",
			default_field: "up",
			display_trimmed: false,
		},
		date_note: {
			enabled: false,
			date_format: "yyyy-MM-dd",
			default_field: "next",
		},
	},

	views: {
		page: {
			all: {
				readable_line_width: true,
			},

			grid: {
				enabled: true,
				no_path_message: "",
				show_node_options: {
					ext: false,
					folder: false,
					alias: false,
				},
			},
			prev_next: {
				enabled: true,
				show_node_options: {
					ext: false,
					folder: false,
					alias: false,
				},
			},
		},
		side: {
			matrix: {
				show_node_options: {
					ext: false,
					folder: true,
					alias: false,
				},
			},
		},
	},

	commands: {
		rebuild_graph: {
			notify: true,

			trigger: {
				note_save: false,
				layout_change: false,
			},
		},

		list_index: {
			default_options: ListIndex.DEFAULT_OPTIONS,
		},

		freeze_implied_edges: {
			default_options: {
				destination: "frontmatter",
			},
		},
	},
};
