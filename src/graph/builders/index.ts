import { MultiGraph } from "graphology";
import type { BreadcrumbsGraph } from "src/interfaces/graph";
import type BreadcrumbsPlugin from "src/main";
import { add_implied_relationships } from "./implied/implied_relationships";
import { add_real_relationships } from "./real";

export const rebuild_graph = (plugin: BreadcrumbsPlugin) => {
	// Make a new graph, instead of mutating the old one
	const graph: BreadcrumbsGraph = new MultiGraph();

	// Real relationships
	/// The chosen method will add the initial nodes
	Object.entries(add_real_relationships).forEach(([kind, fn]) => {
		fn(graph, plugin);
	});

	// Implied relationships
	Object.entries(add_implied_relationships).forEach(([kind, fn]) => {
		fn(graph, plugin);
	});

	// console.log("all nodes:", graph.nodes());
	// console.log(
	// 	"all edges:",
	// 	graph.mapEdges(
	// 		(_, _attr, source_id, target_id) => `${source_id} -> ${target_id}`
	// 	)
	// );
	return graph;
};
