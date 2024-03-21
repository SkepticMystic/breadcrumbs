import type { ImpliedEdgeBuilder } from "src/interfaces/graph";

export const _add_implied_edges_same_parent_is_sibling: ImpliedEdgeBuilder = (
	graph,
	plugin,
	{ round },
) => {
	plugin.settings.hierarchies.forEach((hierarchy, hierarchy_i) => {
		if (
			hierarchy.implied_relationships.same_parent_is_sibling.rounds <
			round
		) {
			return {};
		}

		graph.forEachNode((source_id) => {
			graph
				.get_attrs_chain_path(
					source_id,
					[
						{ hierarchy_i, dir: "up" },
						{ hierarchy_i, dir: "down" },
					],
					(e) =>
						// Don't include the current source_id in the path
						e.target_id !== source_id &&
						// Consider real edges & implied edges created in a previous round
						(e.attr.explicit || e.attr.round < round),
				)
				.forEach((path) => {
					graph.safe_add_directed_edge(
						source_id,
						path.last()!.target_id,
						{
							round,
							dir: "same",
							hierarchy_i,
							explicit: false,
							implied_kind: "same_parent_is_sibling",
							field: hierarchy.dirs["same"].at(0) ?? null,
						},
					);
				});
		});
	});

	return {};
};
