import { MultiGraph } from "graphology";
import type { BCGraph, GraphEdge } from "src/interfaces/graph";

/** Returns a new graph with all the _nodes_ of the previous, but only a subset of the edges */
export const graph_edge_subset = (
	graph: BCGraph,
	edge_filter: (edge: GraphEdge) => boolean
) => {
	const new_graph = new MultiGraph() as BCGraph;

	graph.forEachNode((id, attr) => new_graph.addNode(id, attr));

	graph.forEachEdge(
		(
			id,
			attr,
			source_id,
			target_id,
			source_attr,
			target_attr,
			undirected
		) => {
			if (
				edge_filter({
					id,
					attr,
					source_id,
					target_id,
					source_attr,
					target_attr,
					undirected,
				})
			) {
				new_graph.addDirectedEdge(source_id, target_id, attr);
			}
		}
	);

	return new_graph;
};
