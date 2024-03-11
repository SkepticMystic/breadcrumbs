import type { EdgeSortId } from "src/const/graph";
import type { Direction } from "src/const/hierarchies";
import type { BCEdge, BCGraph } from "src/graph/MyMultiGraph";
import { Traverse, type NestedEdgePath } from "src/graph/traverse";
import { get_edge_sorter, stringify_node } from "src/graph/utils";
import type { LinkKind } from "src/interfaces/links";
import type { ShowNodeOptions } from "src/interfaces/settings";
import { Links } from "src/utils/links";

export namespace ListIndex {
	export type Options = {
		dir: Direction;
		hierarchy_i: number;
		indent: string;
		link_kind: LinkKind;
		show_node_options: ShowNodeOptions;
		edge_sort_id: EdgeSortId;
	};

	export const DEFAULT_OPTIONS: Options = {
		dir: "down",
		indent: "\\t",
		hierarchy_i: -1,
		link_kind: "wiki",
		edge_sort_id: {
			order: 1,
			field: "basename",
		},
		show_node_options: { ext: false, alias: true, folder: false },
	};

	const flat_paths_to_list_index = (
		flat_paths: {
			edge: BCEdge;
			depth: number;
		}[],
		{
			indent,
			link_kind,
			show_node_options,
		}: {
			indent: string;
			link_kind: LinkKind;
			show_node_options: ShowNodeOptions;
		},
	) => {
		let index = "";
		const real_indent = indent.replace(/\\t/g, "\t");

		flat_paths.forEach(({ depth, edge }) => {
			const display = stringify_node(edge.target_id, edge.target_attr, {
				show_node_options,
			});

			const link = Links.ify(edge.target_id, display, {
				link_kind,
			});

			index += real_indent.repeat(depth) + `- ${link}\n`;
		});

		return index;
	};

	// TODO: Write unit tests to confirm this does the same thing as flat_paths_to_list_index above
	const nested_paths_to_list_index = (
		nested_paths: NestedEdgePath[],
		{
			indent,
			link_kind,
			show_node_options,
		}: {
			indent: string;
			link_kind: LinkKind;
			show_node_options: ShowNodeOptions;
		},
	) => {
		let index = "";
		const real_indent = indent.replace(/\\t/g, "\t");

		nested_paths.forEach(({ children, depth, edge }) => {
			const display = stringify_node(edge.target_id, edge.target_attr, {
				show_node_options,
			});

			const link = Links.ify(edge.target_id, display, {
				link_kind,
			});

			index += real_indent.repeat(depth) + `- ${link}\n`;

			index += nested_paths_to_list_index(children, {
				indent,
				link_kind,
				show_node_options,
			});
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
					Traverse.all_paths(
						"depth_first",
						graph,
						start_node,
						(e) =>
							e.attr.dir === options.dir &&
							(options.hierarchy_i === -1 ||
								e.attr.hierarchy_i === options.hierarchy_i),
					),
				),
				get_edge_sorter(options.edge_sort_id),
			),
			options,
		);
}
