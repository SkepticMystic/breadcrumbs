import { ListIndex } from "src/commands/list_index";
import type {
	BreadcrumbsSettings,
	ShowNodeOptions,
} from "src/interfaces/settings";
import { blank_hierarchy } from "src/utils/hierarchies";
import type { EdgeSortId } from "./graph";

export const IMPLIED_RELATIONSHIP_MAX_ROUNDS = 10;

const DEFAULT_EDGE_SORT_ID: EdgeSortId = { field: "basename", order: 1 };

const DEFAULT_SHOW_NODE_OPTIONS: ShowNodeOptions = {
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
		johnny_decimal_note: {
			enabled: false,
			delimiter: ".",
			default_field: "up",
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
				selection: "all",
				default_depth: 999,
				no_path_message: "",
				show_controls: true,
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
				collapse: false,
				default_dir: "down",
				show_attributes: [],
				edge_sort_id: { ...DEFAULT_EDGE_SORT_ID },
				show_node_options: { ...DEFAULT_SHOW_NODE_OPTIONS },
			},
		},

		codeblocks: {
			show_node_options: { ...DEFAULT_SHOW_NODE_OPTIONS },
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

		thread: {
			default_options: {
				destination: "frontmatter",
				target_path_template:
					"{{source.folder}}/{{attr.field}} {{source.basename}}",
			},
		},
	},

	suggestors: {
		hierarchy_field: {
			enabled: false,
			trigger: ".",
		},
	},

	debug: {
		level: "INFO",
	},
};
