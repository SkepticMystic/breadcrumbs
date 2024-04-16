import type { EdgeSortId } from "src/const/graph";
import type { BCGraph } from "src/graph/MyMultiGraph";
import { Traverse, type NestedEdgePath } from "src/graph/traverse";
import {
	get_edge_sorter,
	has_edge_attrs,
	stringify_node,
} from "src/graph/utils";
import type { LinkKind } from "src/interfaces/links";
import type { ShowNodeOptions } from "src/interfaces/settings";
import { Links } from "src/utils/links";

export namespace ListIndex {
	export type Options = {
		// TODO: merge_fields: boolean;
		fields: string[];
		indent: string;
		link_kind: LinkKind;
		show_node_options: ShowNodeOptions;
		edge_sort_id: EdgeSortId;
	};

	export const DEFAULT_OPTIONS: Options = {
		fields: [],
		indent: "\\t",
		link_kind: "wiki",
		edge_sort_id: {
			order: 1,
			field: "basename",
		},
		show_node_options: { ext: false, alias: true, folder: false },
	};

	const nested_paths_to_list_index = (
		nested_paths: NestedEdgePath[],
		options: {
			indent: string;
			link_kind: LinkKind;
			show_node_options: ShowNodeOptions;
		},
	) => {
		let index = "";
		const real_indent = options.indent.replace(/\\t/g, "\t");

		nested_paths.forEach(({ children, depth, edge }) => {
			const display = stringify_node(edge.target_id, edge.target_attr, {
				show_node_options: options.show_node_options,
			});

			const link = Links.ify(edge.target_id, display, {
				link_kind: options.link_kind,
			});

			index += real_indent.repeat(depth) + `- ${link}\n`;

			index += nested_paths_to_list_index(children, options);
		});

		return index;
	};

	export const build = (
		graph: BCGraph,
		start_node: string,
		options: Options,
	) =>
		nested_paths_to_list_index(
			Traverse.sort_nested_paths(
				Traverse.nest_all_paths(
					Traverse.all_paths("depth_first", graph, start_node, (e) =>
						has_edge_attrs(e, { $or_fields: options.fields }),
					),
				),
				get_edge_sorter(options.edge_sort_id, graph),
			),
			options,
		);
}
