import type { BCEdge, BCGraph } from "./MyMultiGraph";
import { is_self_loop, type EdgeSorter } from "./utils";

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
		.get_out_edges(start_node)
		.filter((e) => !is_self_loop(e) && (!edge_filter || edge_filter(e, 0)))
		.map((edge) => ({
			// NOTE: It's a little redundant to add the start_edge,
			//    but it makes the code simpler (e.g. GridView)
			path: [edge],
		}));

	while (stack.length > 0) {
		const stack_item = stack.pop()!;
		const current_edge = stack_item.path.at(-1)!;

		// TODO: Now that we check visited in filtered_out_edges, is this redundant?
		if (visited.has(current_edge.id)) {
			continue;
		} else {
			visited.add(current_edge.id);
		}

		const filtered_out_edges = graph
			.get_out_edges(current_edge.target_id)
			.filter(
				(e) =>
					!is_self_loop(e) &&
					// In the case of a loop of more than one node
					!visited.has(e.id) &&
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
			// Have we visited a target from a particular source at this depth?
			const key = `${depth}-${edge.source_id}-${edge.target_id}`;

			if (!visited.has(key)) {
				visited.add(key);

				flattened.push({ edge, depth });
			}
		});
	});

	return flattened;
};

// const flatten_nested_paths = (nested_paths: NestedEdgePath[]) => {
// 	const flattened: {
// 		edge: BCEdge;
// 		depth: number;
// 	}[] = [];

// 	nested_paths.forEach((nested_path) => {
// 		flattened.push({ edge: nested_path.edge, depth: nested_path.depth });
// 		flattened.push(...flatten_nested_paths(nested_path.children));
// 	});

// 	return flattened;
// };

/** Sort a nested list of paths on a per-depth level.
 * Mutates the input.
 */
const sort_nested_paths = (
	nested_paths: NestedEdgePath[],
	sorter: EdgeSorter,
) => {
	nested_paths.forEach((nested_path) => {
		nested_path.children = sort_nested_paths(nested_path.children, sorter);
	});

	return nested_paths.sort((a, b) => sorter(a.edge, b.edge));
};

export const Traverse = {
	alg,
	all_paths,
	flatten_all_paths,
	// flatten_nested_paths,
	nest_all_paths,
	sort_nested_paths,
};
