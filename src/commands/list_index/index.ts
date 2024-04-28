import type { EdgeSortId } from "src/const/graph";
import type { EdgeAttribute } from "src/graph/MyMultiGraph";
import { Traverse, type EdgeTree } from "src/graph/traverse";
import {
	get_edge_sorter,
	has_edge_attrs,
	stringify_node,
} from "src/graph/utils";
import type { LinkKind } from "src/interfaces/links";
import type { ShowNodeOptions } from "src/interfaces/settings";
import { Links } from "src/utils/links";
import { untyped_pick } from "src/utils/objects";
import { url_search_params } from "src/utils/url";
import type { NoteGraph, RecTraversalData } from "wasm/pkg/breadcrumbs_graph_wasm";

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

	export const edge_tree_to_list_index = (
		tree: RecTraversalData[],
		options: Pick<
			Options,
			"link_kind" | "indent" | "show_node_options" | "show_attributes"
		>,
	) => {
		let index = "";
		const real_indent = options.indent.replace(/\\t/g, "\t");

		tree.forEach(({ children, depth, edge, node }) => {
			const display = stringify_node(node, {
				show_node_options: options.show_node_options,
			});

			const link = Links.ify(node.path, display, {
				link_kind: options.link_kind,
			});

			// TODO: show_attributes
			// const attr = options.show_attributes.length
			// 	? ` (${url_search_params(
			// 			untyped_pick(edge.attr, options.show_attributes),
			// 			{ trim_lone_param: true },
			// 		)})`
			// 	: "";
			const attr = "";

			index += real_indent.repeat(depth) + `- ${link}${attr}\n`;

			index += edge_tree_to_list_index(children, options);
		});

		return index;
	};

	// TODO
	export const build = (
		graph: NoteGraph,
		start_node: string,
		options: Options,
	) =>
		edge_tree_to_list_index(
			Traverse.sort_edge_tree(
				Traverse.build_tree(graph, start_node, options, (e) =>
					has_edge_attrs(e, { $or_fields: options.fields }),
				),
				get_edge_sorter(options.edge_sort_id, graph),
			),
			options,
		);
}
