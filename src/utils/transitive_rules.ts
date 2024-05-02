// import type { BCEdge } from "src/graph/MyMultiGraph";
import type { BreadcrumbsSettings } from "src/interfaces/settings";
import { url_search_params } from "src/utils/url";

export const stringify_transitive_relation = (
	rule: Pick<
		BreadcrumbsSettings["implied_relations"]["transitive"][number],
		"chain" | "close_field" | "close_reversed"
	>,
) =>
	`[${rule.chain
		.map((attr) => url_search_params(attr, { trim_lone_param: true }))
		.join(", ")}] ${rule.close_reversed ? "←" : "→"} ${rule.close_field}`;

export const get_transitive_rule_name = (
	rule: Pick<
		BreadcrumbsSettings["implied_relations"]["transitive"][number],
		"chain" | "close_field" | "close_reversed" | "name"
	>,
) => rule.name || stringify_transitive_relation(rule);

/** Create sample edges from a transitive closure rule */
// export const transitive_rule_to_edges = (
// 	rule: Pick<
// 		BreadcrumbsSettings["implied_relations"]["transitive"][number],
// 		"chain" | "close_field" | "close_reversed" | "name"
// 	>,
// ) => {
// 	const edges: Omit<BCEdge, "id" | "undirected">[] = [];

// 	rule.chain.forEach((attr, i) => {
// 		edges.push({
// 			source_id: i.toString(),
// 			target_id: (i + 1).toString(),
// 			source_attr: { resolved: true },
// 			target_attr: { resolved: true },
// 			attr: {
// 				explicit: true,
// 				field: attr.field ?? "<field>",
// 				source: "typed_link",
// 			},
// 		});
// 	});

// 	edges.push({
// 		source_attr: { resolved: true },
// 		target_attr: { resolved: true },
// 		source_id: rule.close_reversed ? rule.chain.length.toString() : "0",
// 		target_id: rule.close_reversed ? "0" : rule.chain.length.toString(),
// 		attr: {
// 			round: 1,
// 			explicit: false,
// 			field: rule.close_field,
// 			implied_kind: `transitive:${get_transitive_rule_name(rule)}`,
// 		},
// 	});

// 	return edges;
// };
