import { objectify_edge_mapper } from "src/graph/objectify_mappers";
import { is_self_loop } from "src/graph/utils";
import type { ImpliedEdgeBuilder } from "src/interfaces/graph";
import { get_opposite_direction } from "src/utils/hierarchies";

export const _add_implied_edges_opposite_direction: ImpliedEdgeBuilder = (
	graph,
	plugin,
	{ round },
) => {
	plugin.settings.hierarchies.forEach((hierarchy, hierarchy_i) => {
		if (hierarchy.implied_relationships.opposite_direction.rounds < round) {
			return {};
		}

		// TODO: Transform this to a transitive chain
		graph
			.mapOutEdges(objectify_edge_mapper((e) => e))
			.filter(
				(e) =>
					// NOTE: Don't need to check for a self-loop, because the implied edge would have the same edge.id as the original edge
					e.attr.hierarchy_i === hierarchy_i &&
					// Consider real edges & implied edges created in a previous round
					(e.attr.explicit || e.attr.round < round),
			)
			.forEach((e) => {
				const opposite_direction = get_opposite_direction(e.attr.dir);

				graph.safe_add_directed_edge(e.target_id, e.source_id, {
					round,
					hierarchy_i,
					explicit: false,
					dir: opposite_direction,
					implied_kind: "opposite_direction",
					field: hierarchy.dirs[opposite_direction].at(0) ?? null,
				});
			});
	});

	return {};
};
