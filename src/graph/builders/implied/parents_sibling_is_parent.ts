import type { ImpliedEdgeBuilder } from "src/interfaces/graph";

export const _add_implied_edges_parents_sibling_is_parent: ImpliedEdgeBuilder =
	(graph, plugin, { round }) => {
		plugin.settings.hierarchies.forEach((hierarchy, hierarchy_i) => {
			if (
				hierarchy.implied_relationships.parents_sibling_is_parent
					.rounds < round
			) {
				return {};
			}

			graph.forEachNode((source_id) => {
				graph
					.get_dir_chains_path(
						source_id,
						["up", "same"],
						(e) =>
							e.attr.hierarchy_i === hierarchy_i &&
							// Consider real edges & implied edges created in a previous round
							(e.attr.explicit || e.attr.round < round) &&
							// Don't include the current source_id in the path
							e.target_id !== source_id,
					)
					.forEach((path) => {
						graph.safe_add_directed_edge(
							source_id,
							path.last()!.target_id,
							{
								round,
								dir: "up",
								hierarchy_i,
								explicit: false,
								implied_kind: "parents_sibling_is_parent",
								field: hierarchy.dirs["up"].at(0) ?? null,
							},
						);
					});
			});
		});

		return {};
	};
