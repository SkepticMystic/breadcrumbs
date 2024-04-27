// import type { BCGraph } from "src/graph/MyMultiGraph";
import { Traverse } from "src/graph/traverse";
import type { EdgeBuilderResults } from "src/interfaces/graph";
import type { BreadcrumbsSettings } from "src/interfaces/settings";
import type BreadcrumbsPlugin from "src/main";
import { get_transitive_rule_name } from "src/utils/transitive_rules";

// export const _add_implied_edges_transitive = (
// 	graph: BCGraph,
// 	plugin: BreadcrumbsPlugin,
// 	rule: BreadcrumbsSettings["implied_relations"]["transitive"][number],
// 	round: number,
// ) => {
// 	const results: EdgeBuilderResults = { edges: [], errors: [] };

// 	if (rule.rounds < round) {
// 		return results;
// 	} else if (
// 		!plugin.settings.edge_fields.find((f) => f.label === rule.close_field)
// 	) {
// 		results.errors.push({
// 			code: "invalid_setting_value",
// 			path: "implied_relations.transitive[].close_field",
// 			message: `close_field is not a valid BC field: '${rule.close_field}'`,
// 		});

// 		return results;
// 	}

// 	const implied_kind =
// 		`transitive:${get_transitive_rule_name(rule)}` as const;

// 	graph.forEachNode((start_node) => {
// 		Traverse.get_transitive_chain_target_ids(
// 			graph,
// 			start_node,
// 			rule.chain,
// 			(item) => item.edge.target_id !== start_node,
// 		).forEach((end_node) => {
// 			const [source_id, target_id] = rule.close_reversed
// 				? [end_node, start_node]
// 				: [start_node, end_node];

// 			results.edges.push({
// 				source_id,
// 				target_id,
// 				attr: {
// 					round,
// 					implied_kind,
// 					explicit: false,
// 					field: rule.close_field,
// 				},
// 			});
// 		});
// 	});

// 	return results;
// };
