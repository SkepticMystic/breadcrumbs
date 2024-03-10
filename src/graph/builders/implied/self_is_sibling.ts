import type { ImpliedEdgeBuilder } from "src/interfaces/graph";

export const _add_implied_edges_self_is_sibling: ImpliedEdgeBuilder = (
	graph,
	plugin,
	{ round },
) => {
	plugin.settings.hierarchies.forEach((hierarchy, hierarchy_i) => {
		if (hierarchy.implied_relationships.self_is_sibling.rounds < round) {
			return {};
		}

		graph.forEachNode((node) => {
			graph.safe_add_directed_edge(node, node, {
				round,
				hierarchy_i,
				dir: "same",
				explicit: false,
				implied_kind: "self_is_sibling",
				field: hierarchy.dirs.same.at(0) ?? null,
			});
		});
	});

	return {};
};
