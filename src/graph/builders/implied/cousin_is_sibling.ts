import type { ImpliedEdgeBuilder } from "src/interfaces/graph";

export const _add_implied_edges_cousin_is_sibling: ImpliedEdgeBuilder = (
	graph,
	plugin,
) => {
	plugin.settings.hierarchies.forEach((hierarchy, hierarchy_i) => {
		if (!hierarchy.implied_relationships.cousin_is_sibling) {
			return;
		}

		graph.forEachNode((source_id) => {
			graph
				.get_dir_chains_path(
					source_id,
					["up", "same", "down"],
					(edge) =>
						edge.attr.hierarchy_i === hierarchy_i &&
						edge.attr.explicit &&
						// Don't include the current source_id in the path
						edge.target_id !== source_id,
				)
				.forEach((path) => {
					console.log("path", path);
					graph.safe_add_directed_edge(
						source_id,
						path.last()!.target_id,
						{
							dir: "same",
							hierarchy_i,
							explicit: false,
							implied_kind: "cousin_is_sibling",
							field: hierarchy.dirs["same"].at(0) ?? null,
						},
					);
				});
		});
	});

	return {};
};
