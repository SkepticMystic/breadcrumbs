import { ListIndex } from "src/commands/list_index";
import type {
	BreadcrumbsSettings,
	ShowNodeOptions,
} from "src/interfaces/settings";
import type { EdgeSortId } from "./graph";

export const IMPLIED_RELATIONSHIP_MAX_ROUNDS = 10;

const DEFAULT_EDGE_SORT_ID: EdgeSortId = { field: "basename", order: 1 };

const DEFAULT_SHOW_NODE_OPTIONS: ShowNodeOptions = {
	ext: false,
	folder: false,
	alias: false,
};

export const DEFAULT_SETTINGS: BreadcrumbsSettings = {
	edge_fields: [
		{ label: "up" },
		{ label: "down" },
		{ label: "same" },
		{ label: "next" },
		{ label: "prev" },
	],

	edge_field_groups: [
		{
			label: "ups",
			fields: ["up"],
		},
		{
			label: "downs",
			fields: ["down"],
		},
		{
			label: "sames",
			fields: ["same"],
		},
		{
			label: "nexts",
			fields: ["next"],
		},
		{
			label: "prevs",
			fields: ["prev"],
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

	implied_relations: {
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
				merge_fields: false,
				field_group_labels: ["ups"],
				show_node_options: { ...DEFAULT_SHOW_NODE_OPTIONS },
			},
			prev_next: {
				enabled: true,
				show_node_options: { ...DEFAULT_SHOW_NODE_OPTIONS },
				field_group_labels: {
					prev: ["prevs"],
					next: ["nexts"],
				},
			},
		},
		side: {
			matrix: {
				show_attributes: [],
				edge_sort_id: { ...DEFAULT_EDGE_SORT_ID },
				show_node_options: { ...DEFAULT_SHOW_NODE_OPTIONS },
				field_group_labels: ["ups", "downs", "sames", "nexts", "prevs"],
			},

			tree: {
				collapse: false,
				show_attributes: [],
				merge_fields: false,
				field_group_labels: ["downs"],
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
		edge_field: {
			enabled: false,
			trigger: ".",
		},
	},

	debug: {
		level: "INFO",
	},
};
