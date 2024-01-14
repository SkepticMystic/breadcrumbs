import type { BreadcrumbsGraph, GraphEdge } from "src/interfaces/graph";
import { objectify_edge_mapper } from "./objectify_mappers";
import { is_self_loop, stringify_edge } from "./utils";

type StackItem = {
	path: GraphEdge[];
};

type Traverser = (
	graph: BreadcrumbsGraph,
	start_node: string,
	callback: (
		current_stack_item: StackItem,
		filtered_out_edges: GraphEdge[]
	) => void,
	edge_filter?: (edge: GraphEdge) => boolean
) => void;

const depth_first: Traverser = (graph, start_node, callback, edge_filter?) => {
	// edge_ids visited so far
	const visited = new Set<string>();

	// Initial stack contains the filtered_out_edges of the start_node
	const stack: StackItem[] = graph
		.mapOutEdges(
			start_node,
			objectify_edge_mapper((e) => e)
		)
		.filter((e) => !is_self_loop(e) && (!edge_filter || edge_filter(e)))
		.map((edge) => ({
			edge,
			// NOTE: It's a little redundant to add the start_edge,
			//    but it makes the code simpler (e.g. GridView)
			path: [edge],
		}));

	while (stack.length > 0) {
		const stack_item = stack.pop()!;
		const current_edge = stack_item.path.last()!;
		console.log("current_edge:", stringify_edge(current_edge));

		if (visited.has(current_edge.id)) continue;
		else visited.add(current_edge.id);

		const filtered_out_edges = graph
			.mapOutEdges(
				current_edge.target_id,
				objectify_edge_mapper((e) => e)
			)
			.filter(
				(e) => !is_self_loop(e) && (!edge_filter || edge_filter(e))
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

const get_traversal_paths = (
	traverser: Traverser,
	graph: BreadcrumbsGraph,
	start_node: string,
	edge_filter?: (edge: GraphEdge) => boolean
) => {
	const paths: GraphEdge[][] = [];

	traverser(
		graph,
		start_node,
		({ path }, filtered_out_edges) => {
			if (!filtered_out_edges.length) {
				console.log("pushing path", path);
				paths.push(path);
			}
		},
		edge_filter
	);

	return paths;
};

export const traverse_graph = {
	depth_first,
	get_traversal_paths,
};
