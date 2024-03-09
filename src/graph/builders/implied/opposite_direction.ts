import type { ImpliedEdgeBuilder } from "src/interfaces/graph";
import { get_opposite_direction } from "src/utils/hierarchies";

export const _add_implied_edges_opposite_direction: ImpliedEdgeBuilder = (
	graph,
	plugin,
	all_real_edges,
) => {
	plugin.settings.hierarchies.forEach((hierarchy, hierarchy_i) => {
		if (!hierarchy.implied_relationships.opposite_direction) {
			return;
		}

		all_real_edges
			.filter((e) => e.attr.hierarchy_i === hierarchy_i)
			.forEach((e) => {
				const opposite_direction = get_opposite_direction(e.attr.dir);

				graph.safe_add_directed_edge(e.target_id, e.source_id, {
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
