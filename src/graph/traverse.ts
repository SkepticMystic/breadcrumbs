import type { BreadcrumbsGraph, GraphEdge } from "src/interfaces/graph";

const depth_first = (
	graph: BreadcrumbsGraph,
	start_node: string,
	callback: (edge: GraphEdge) => void,
	edge_filter?: (edge: GraphEdge) => boolean
) => {
	const visited = new Set<string>();
	const stack = [start_node];

	while (stack.length > 0) {
		const current_node = stack.pop()!;

		if (visited.has(current_node)) {
			continue;
		} else {
			visited.add(current_node);
		}

		graph.forEachOutEdge(
			current_node,
			(
				id,
				attr,
				source_id,
				target_id,
				source_attr,
				target_attr,
				undirected
			) => {
				const edge: GraphEdge = {
					id,
					attr,
					source_id,
					target_id,
					source_attr,
					target_attr,
					undirected,
				};

				if (edge_filter && !edge_filter(edge)) {
					return;
				}

				// This is a little weird, I guess...
				// Instead of running the callback on each node as it's visted,
				//   we run it on the edge as it gets added to the stack.
				callback(edge);

				stack.push(target_id);
			}
		);
	}
};

export const traverse_graph = {
	depth_first,
};
