import { objectify_edge_mapper } from "src/graph/objectify_mappers";
import type { ImpliedEdgeBuilder } from "src/interfaces/graph";

export const _add_implied_edges_parents_sibling_is_parent: ImpliedEdgeBuilder =
	(graph, plugin, all_real_edges) => {
		plugin.settings.hierarchies.forEach((hierarchy, hierarchy_i) => {
			if (!hierarchy.implied_relationships.parents_sibling_is_parent) {
				return;
			}

			// Get all the edges going up from the current node, in the current hierarchy
			all_real_edges
				.filter(
					(e) =>
						e.attr.hierarchy_i === hierarchy_i &&
						e.attr.dir === "up",
				)
				.forEach((up_edge) => {
					graph
						.mapOutEdges(
							up_edge.target_id,
							objectify_edge_mapper((e) => e),
						)
						// Get the real sibling edges from the parent node
						//   Ensuring they're in the same hierarchy,
						//   and also don't point back to the current node (TODO: Is this necessary? Techincally, relations within the same hierarchy shouldn't enable that)
						.filter(
							(sibling_edge) =>
								sibling_edge.attr.hierarchy_i === hierarchy_i &&
								sibling_edge.attr.explicit &&
								sibling_edge.attr.dir === "same" &&
								sibling_edge.target_id !== up_edge.source_id,
						)
						.forEach((sibling_edge) => {
							// Add an up edge from the og node to the implied parent
							graph.addDirectedEdge(
								up_edge.source_id,
								sibling_edge.target_id,
								{
									dir: "up",
									hierarchy_i,
									explicit: false,
									implied_kind: "parents_sibling_is_parent",
									field: hierarchy.dirs["up"].at(0) ?? null,
								},
							);

							// Add a down edge from the implied parent to the og node
							graph.addDirectedEdge(
								sibling_edge.target_id,
								up_edge.source_id,
								{
									dir: "down",
									hierarchy_i,
									explicit: false,
									implied_kind: "parents_sibling_is_parent",
									field: hierarchy.dirs["down"].at(0) ?? null,
								},
							);
						});
				});
		});

		return {};
	};
