import type { LinkKind } from "src/interfaces/links";
import type { ShowNodeOptions } from "src/interfaces/settings";
import { Links } from "src/utils/links";
import type { BCEdge, BCGraph } from "./MyMultiGraph";
import { objectify_edge_mapper } from "./objectify_mappers";
import { is_self_loop, stringify_node } from "./utils";

type StackItem = {
	path: BCEdge[];
};

type Traverser = (
	graph: BCGraph,
	start_node: string,
	callback: (
		current_stack_item: StackItem,
		filtered_out_edges: BCEdge[],
	) => void,
	edge_filter?: (edge: BCEdge, depth: number) => boolean,
) => void;

const depth_first: Traverser = (graph, start_node, callback, edge_filter?) => {
	// edge_ids visited so far
	const visited = new Set<string>();

	// Initial stack contains the filtered_out_edges of the start_node
	const stack: StackItem[] = graph
		.mapOutEdges(
			start_node,
			objectify_edge_mapper((e) => e),
		)
		.filter((e) => !is_self_loop(e) && (!edge_filter || edge_filter(e, 0)))
		.map((edge) => ({
			edge,
			// NOTE: It's a little redundant to add the start_edge,
			//    but it makes the code simpler (e.g. GridView)
			path: [edge],
		}));

	while (stack.length > 0) {
		const stack_item = stack.pop()!;
		const current_edge = stack_item.path.last()!;

		if (visited.has(current_edge.id)) continue;
		else visited.add(current_edge.id);

		const filtered_out_edges = graph
			.mapOutEdges(
				current_edge.target_id,
				objectify_edge_mapper((e) => e),
			)
			.filter(
				(e) =>
					!is_self_loop(e) &&
					(!edge_filter || edge_filter(e, stack_item.path.length)),
			);

		// Act on the current stack item
		callback(stack_item, filtered_out_edges);

		// And push the next edges
		filtered_out_edges.forEach((out_edge) => {
			// But push the next edge
			stack.push({ path: stack_item.path.concat(out_edge) });
		});
	}
};

const alg = {
	depth_first,
};

const all_paths = (
	alg_name: keyof typeof alg,
	graph: BCGraph,
	start_node: string,
	edge_filter?: (edge: BCEdge, depth: number) => boolean,
) => {
	const paths: BCEdge[][] = [];

	alg[alg_name](
		graph,
		start_node,
		({ path }, filtered_out_edges) => {
			if (!filtered_out_edges.length) {
				paths.push(path);
			}
		},
		edge_filter,
	);

	return paths;
};

export type NestedEdgePath = {
	edge: BCEdge;
	depth: number;
	children: NestedEdgePath[];
};

const nest_all_paths = (all_paths: BCEdge[][]) => {
	const nested_edges: NestedEdgePath[] = [];

	all_paths.forEach((path) => {
		let current_nest = nested_edges;

		path.forEach((edge, depth) => {
			// Same criteria to flatten_all_paths
			// Have we visited this node at this depth?
			const existing_nest = current_nest.find(
				(nest) =>
					nest.edge.target_id === edge.target_id &&
					nest.depth === depth,
			);

			if (existing_nest) {
				current_nest = existing_nest.children;
			} else {
				const new_nest = {
					edge,
					depth,
					children: [],
				};

				current_nest.push(new_nest);
				current_nest = new_nest.children;
			}
		});
	});

	return nested_edges;
};

const flatten_all_paths = (paths: BCEdge[][]) => {
	const visited = new Set<string>();
	const flattened: {
		edge: BCEdge;
		depth: number;
	}[] = [];

	paths.forEach((path) => {
		path.forEach((edge, depth) => {
			const key = `${depth}-${edge.target_id}`;

			if (!visited.has(key)) {
				visited.add(key);

				flattened.push({ edge, depth });
			}
		});
	});

	return flattened;
};

const flat_paths_to_index_list = (
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

export const Traverse = {
	alg,
	all_paths,
	flatten_all_paths,
	flat_paths_to_index_list,
	nest_all_paths,
};
