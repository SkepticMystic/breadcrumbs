import { ListIndex } from "src/commands/list_index";
import type { BreadcrumbsSettings } from "src/interfaces/settings";
import { blank_hierarchy } from "src/utils/hierarchies";

export const IMPLIED_RELATIONSHIP_MAX_ROUNDS = 10;

const DEFAULT_SHOW_NODE_OPTIONS = {
	ext: false,
	folder: false,
	alias: false,
};

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
		typed_link: {},
		list_note: {
			// Disabled by default
			default_neighbour_field: "",
		},
		tag_note: {
			default_field: "up",
		},
		regex_note: {
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
			stretch_to_existing: false,
		},
	},

	custom_implied_relations: {
		transitive: [],
	},

	views: {
		page: {
			all: {
				sticky: false,
				readable_line_width: true,
			},

			trail: {
				enabled: true,
				format: "grid",
				default_depth: 999,
				selection: "all",
				no_path_message: "",
				show_node_options: { ...DEFAULT_SHOW_NODE_OPTIONS },
			},
			prev_next: {
				enabled: true,
				show_node_options: { ...DEFAULT_SHOW_NODE_OPTIONS },
			},
		},
		side: {
			matrix: {
				show_node_options: { ...DEFAULT_SHOW_NODE_OPTIONS },
			},

			tree: {
				default_dir: "down",
				show_node_options: { ...DEFAULT_SHOW_NODE_OPTIONS },
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

	codeblocks: {
		show_node_options: { ...DEFAULT_SHOW_NODE_OPTIONS },
	},
};
