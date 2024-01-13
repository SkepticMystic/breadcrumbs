import type { GraphBuilder } from "src/interfaces/graph";
import type { Hierarchy } from "src/interfaces/hierarchies";
import {
	fallback_field_format,
	get_opposite_direction,
} from "src/utils/hierarchies";
import { objectify_edge_mapper } from "./objectify_mappers";

const opposite_direction: GraphBuilder = (graph, plugin) => {
	// NOTE: Rather than directly forEachOutEdge, we map over them to "freeze" the existing ones, then add edges (to avoid infite loop)
	graph
		.mapOutEdges(
			objectify_edge_mapper(({ attr, source_id, target_id }) => ({
				attr,
				source_id,
				target_id,
			}))
		)
		.forEach(({ attr, source_id, target_id }) => {
			const hierarchy = plugin.settings.hierarchies[attr.hierarchy_i];

			if (!hierarchy.implied_relationships.opposite_direction) {
				return;
			}

			const opposite_direction = get_opposite_direction(attr.dir);

			graph.addDirectedEdge(target_id, source_id, {
				explicit: false,
				dir: opposite_direction,
				hierarchy_i: attr.hierarchy_i,
				implied_kind: "opposite_direction",
				field:
					hierarchy.dirs[opposite_direction].at(0) ??
					fallback_field_format(opposite_direction),
			});
		});

	return graph;
};

const self_is_sibling: GraphBuilder = (graph, plugin) => {
	graph.forEachNode((node) => {
		// NOTE: For now, add it for all hierarchies.
		// But in future, this should be toggable per hierarchy
		plugin.settings.hierarchies.forEach((hierarchy, i) => {
			if (!hierarchy.implied_relationships.self_is_sibling) return;

			graph.addDirectedEdge(node, node, {
				dir: "same",
				hierarchy_i: i,
				explicit: false,
				implied_kind: "self_is_sibling",
				field:
					hierarchy.dirs.same.at(0) ?? fallback_field_format("same"),
			});
		});
	});

	return graph;
};

export const implied_relationships: Record<
	keyof Hierarchy["implied_relationships"],
	GraphBuilder
> = {
	opposite_direction,
	self_is_sibling,
};
