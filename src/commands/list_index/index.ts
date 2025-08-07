import type { EdgeSortId } from "src/const/graph";
import type { EdgeAttribute } from "src/graph/utils";
import { to_node_stringify_options } from "src/graph/utils";
import type { LinkKind } from "src/interfaces/links";
import type {
	BreadcrumbsSettings,
	ShowNodeOptions,
} from "src/interfaces/settings";
import { Links } from "src/utils/links";
import type {
	FlatTraversalData,
	FlatTraversalResult,
	NoteGraph,
} from "wasm/pkg/breadcrumbs_graph_wasm";
import {
	TraversalOptions,
	TraversalPostprocessOptions,
	create_edge_sorter,
} from "wasm/pkg/breadcrumbs_graph_wasm";

export interface ListIndexOptions {
	// TODO: merge_fields: boolean;
	indent: string;
	fields: string[];
	max_count?: number;
	max_depth?: number;
	link_kind: LinkKind;
	edge_sort_id: EdgeSortId;
	field_group_labels: string[];
	show_attributes: EdgeAttribute[];
	show_node_options: ShowNodeOptions;
}

export const LIST_INDEX_DEFAULT_OPTIONS: ListIndexOptions = {
	fields: [],
	indent: "\\t",
	link_kind: "wiki",
	show_attributes: [],
	field_group_labels: [],
	edge_sort_id: {
		order: 1,
		field: "basename",
	},
	show_node_options: {
		ext: false,
		alias: true,
		folder: false,
	},
};

// TODO(Rust): This should probably be moved to the Rust side
export function edge_tree_to_list_index(
	graph: NoteGraph,
	tree: FlatTraversalResult | undefined,
	plugin_settings: BreadcrumbsSettings | undefined,
	options: Pick<
		ListIndexOptions,
		"link_kind" | "indent" | "show_node_options" | "show_attributes"
	>,
): string {
	if (!tree) {
		return "";
	}

	const all_traversal_data = tree.data;

	const current_nodes = Array.from(tree.entry_nodes).map(
		(node_index) => all_traversal_data[node_index],
	);
	return edge_tree_to_list_index_inner(
		graph,
		all_traversal_data,
		current_nodes,
		plugin_settings,
		options,
	);
}

function edge_tree_to_list_index_inner(
	graph: NoteGraph,
	all_traversal_data: FlatTraversalData[],
	current_nodes: FlatTraversalData[],
	plugin_settings: BreadcrumbsSettings | undefined,
	options: Pick<
		ListIndexOptions,
		"link_kind" | "indent" | "show_node_options" | "show_attributes"
	>,
): string {
	let index = "";
	const real_indent = options.indent.replace(/\\t/g, "\t");

	current_nodes.forEach((datum) => {
		const { edge, children, depth } = datum;

		const display = edge.stringify_target(
			graph,
			to_node_stringify_options(
				plugin_settings,
				options.show_node_options,
			),
		);

		const link = Links.ify(edge.target_path(graph), display, {
			link_kind: options.link_kind,
		});

		const attr = edge.get_attribute_label(graph, options.show_attributes);

		index +=
			real_indent.repeat(depth - 1) +
			(attr ? `- ${link} (${attr})\n` : `- ${link}\n`);

		const new_children = Array.from(children).map(
			(child_id) => all_traversal_data[child_id],
		);

		index += edge_tree_to_list_index_inner(
			graph,
			all_traversal_data,
			new_children,
			plugin_settings,
			options,
		);
	});

	return index;
}

export function build_list_index(
	graph: NoteGraph,
	start_node: string,
	plugin_settings: BreadcrumbsSettings | undefined,
	options: ListIndexOptions,
): string {
	const traversal_options = new TraversalOptions(
		[start_node],
		options.fields,
		options.max_depth ?? 100,
		options.max_count ?? 1000,
		false,
	);

	const postprocess_options = new TraversalPostprocessOptions(
		create_edge_sorter(
			options.edge_sort_id.field,
			options.edge_sort_id.order === -1,
		),
		false,
	);

	const traversal_result = graph.rec_traverse_and_process(
		traversal_options,
		postprocess_options,
	);

	return edge_tree_to_list_index(
		graph,
		traversal_result,
		plugin_settings,
		options,
	);
}
