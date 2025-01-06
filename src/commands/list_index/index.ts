import type { EdgeSortId } from "src/const/graph";
import type { LinkKind } from "src/interfaces/links";
import type { ShowNodeOptions } from "src/interfaces/settings";
import type BreadcrumbsPlugin from "src/main";
import { Links } from "src/utils/links";
import { toNodeStringifyOptions, type EdgeAttribute } from "src/graph/utils";
import { FlatTraversalData, FlatTraversalResult, TraversalOptions, TraversalPostprocessOptions, create_edge_sorter } from "wasm/pkg/breadcrumbs_graph_wasm";

export namespace ListIndex {
	export type Options = {
		// TODO: merge_fields: boolean;
		indent: string;
		fields: string[];
		// TODO
		max_depth?: number;
		link_kind: LinkKind;
		edge_sort_id: EdgeSortId;
		field_group_labels: string[]; 
		show_attributes: EdgeAttribute[];
		show_node_options: ShowNodeOptions;
	};

	export const DEFAULT_OPTIONS: Options = {
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
	export const edge_tree_to_list_index = (
		plugin: BreadcrumbsPlugin,
		tree: FlatTraversalResult,
		options: Pick<
			Options,
			"link_kind" | "indent" | "show_node_options" | "show_attributes"
		>,
	) => {
		const all_traversal_data = tree.data;
		const current_nodes = Array.from(tree.entry_nodes).map((node_index) => all_traversal_data[node_index]);
		return edge_tree_to_list_index_inner(plugin, all_traversal_data, current_nodes, options);
	};

	export const edge_tree_to_list_index_inner = (
		plugin: BreadcrumbsPlugin,
		all_traversal_data: FlatTraversalData[],
		current_nodes: FlatTraversalData[],
		options: Pick<
			Options,
			"link_kind" | "indent" | "show_node_options" | "show_attributes"
		>,
	) => {
		let index = "";
		const real_indent = options.indent.replace(/\\t/g, "\t");

		current_nodes.forEach(({ children, depth, edge }) => {
			const display = edge.stringify_target(
				plugin.graph, 
				toNodeStringifyOptions(plugin, options.show_node_options)
			);

			const link = Links.ify(edge.target_path(plugin.graph), display, {
				link_kind: options.link_kind,
			});

			const attr = edge.get_attribute_label(plugin.graph, options.show_attributes);

			index += real_indent.repeat(depth) + `- ${link}${attr}\n`;

			const new_children = Array.from(children).map((child_id) => all_traversal_data[child_id]);

			index += edge_tree_to_list_index_inner(
				plugin, 
				all_traversal_data, 
				new_children, 
				options
			);
		});

		return index;
	};

	export const build = (
		plugin: BreadcrumbsPlugin,
		start_node: string,
		options: Options,
	) => {
		const traversal_options = new TraversalOptions(
			[start_node],
			options.fields,
			options.max_depth ?? 100,
			false,
		);

		const postprocess_options = new TraversalPostprocessOptions(
			create_edge_sorter(options.edge_sort_id.field, options.edge_sort_id.order === -1),
			false,
		);

		const traversal_result = plugin.graph.rec_traverse_and_process(traversal_options, postprocess_options);

		return edge_tree_to_list_index(
			plugin,
			traversal_result,
			options,
		);
	}
}
