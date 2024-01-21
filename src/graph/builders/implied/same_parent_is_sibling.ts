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
					.mapInEdges(
						up_edge.target_id,
						objectify_edge_mapper((e) => e),
					)
					// Get all the _other_ real edges pointing up into the parent node
					//   Ensuring they're in the same hierarchy,
					.filter(
						(other_up_edge) =>
							other_up_edge.attr.hierarchy_i === hierarchy_i &&
							other_up_edge.attr.explicit &&
							other_up_edge.attr.dir === "up" &&
							other_up_edge.source_id !== up_edge.source_id,
					)
					.forEach((other_up_edge) => {
						// Add a same edge from the og node to the implied sibling
						// NOTE: This will create two opposing, implied edges between the two nodes
						//   This kinda works though, since the Matrix will just show what's expected
						//   But maybe these could be undirected edges instead?
						//   I'd need to see how those work in graphology
						graph.addDirectedEdge(
							up_edge.source_id,
							other_up_edge.source_id,
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
