import { objectify_edge_mapper } from "src/graph/objectify_mappers";
import type { ImpliedEdgeBuilder } from "src/interfaces/graph";

export const _add_implied_edges_same_parent_is_sibling: ImpliedEdgeBuilder = (
	graph,
	plugin,
	all_real_edges,
) => {
	plugin.settings.hierarchies.forEach((hierarchy, hierarchy_i) => {
		if (!hierarchy.implied_relationships.same_parent_is_sibling) {
			return;
		}

		// Get all the edges going up from the current node, in the current hierarchy
		all_real_edges
			.filter(
				(e) =>
					e.attr.hierarchy_i === hierarchy_i && e.attr.dir === "up",
			)
			.forEach((up_edge) => {
				graph
					.mapOutEdges(
						up_edge.target_id,
						objectify_edge_mapper((e) => e),
					)
					// Get the downward edges from the parent node
					//   Ensuring they're in the same hierarchy,
					//   and also don't point back to the current node
					.filter(
						(down_edge) =>
							down_edge.attr.hierarchy_i === hierarchy_i &&
							down_edge.attr.dir === "down" &&
							down_edge.target_id !== up_edge.source_id,
					)
					.forEach((down_edge) => {
						// Add a same edge from the og node to the implied sibling
						// NOTE: This will create two opposing, implied edges between the two nodes
						//   This kinda works though, since the Matrix will just show what's expected
						//   But maybe these could be undirected edges instead?
						//   I'd need to see how those work in graphology
						graph.addDirectedEdge(
							up_edge.source_id,
							down_edge.target_id,
							{
								hierarchy_i,
								dir: "same",
								explicit: false,
								implied_kind: "same_parent_is_sibling",
								field: hierarchy.dirs.same.at(0) ?? null,
							},
						);
					});
			});
	});

	return {};
};
