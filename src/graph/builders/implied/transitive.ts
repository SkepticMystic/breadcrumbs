import type { BCGraph } from "src/graph/MyMultiGraph";
import { Traverse } from "src/graph/traverse";
import type { ImpliedEdgeBuilderResults } from "src/interfaces/graph";
import type { BreadcrumbsSettings } from "src/interfaces/settings";
import type BreadcrumbsPlugin from "src/main";
import { stringify_transitive_relation } from "src/utils/transitive_rules";

export const _add_implied_edges_transitive = (
	graph: BCGraph,
	plugin: BreadcrumbsPlugin,
	transitive: BreadcrumbsSettings["implied_relations"]["transitive"][number],
	round: number,
) => {
	const results: ImpliedEdgeBuilderResults = { edges: [], errors: [] };

	if (transitive.rounds < round) {
		return results;
	} else if (
		!plugin.settings.edge_fields.find(
			(f) => f.label === transitive.close_field,
		)
	) {
		results.errors.push({
			code: "invalid_setting_value",
			path: "implied_relations.transitive[].close_field",
			message: `close_field is not a valid BC field: '${transitive.close_field}'`,
		});

		return results;
	}

	const implied_kind =
		`transitive:${transitive.name || stringify_transitive_relation(transitive)}` as const;

	graph.forEachNode((start_node) => {
		Traverse.get_transitive_chain_target_ids(
			graph,
			start_node,
			transitive.chain,
			// TODO: Based on Lemon's suggestion, we no longer check that edge.round < round.
			// But isn't that more efficient? To chop off the traversal earlier, than keep on looking?
			(item) => item.edge.target_id !== start_node,
		).forEach((end_node) => {
			const [source_id, target_id] = transitive.close_reversed
				? [end_node, start_node]
				: [start_node, end_node];

			results.edges.push({
				source_id,
				target_id,
				attr: {
					round,
					implied_kind,
					explicit: false,
					field: transitive.close_field,
				},
			});
		});
	});

	return results;
};
