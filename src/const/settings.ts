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
		tag_note: {},
		list_note: {},
		typed_link: {},
		dendron_note: {
			enabled: false,
			delimiter: ".",
			default_field: "up",
			display_trimmed: false,
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
		list_index: {
			default_options: ListIndex.DEFAULT_OPTIONS,
		},
	},
};
