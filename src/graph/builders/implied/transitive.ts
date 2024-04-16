import type { BCGraph } from "src/graph/MyMultiGraph";
import type {
	BreadcrumbsError,
	EdgeToAdd,
	ImpliedEdgeBuilderResults,
} from "src/interfaces/graph";
import type { BreadcrumbsSettings } from "src/interfaces/settings";
import type BreadcrumbsPlugin from "src/main";
import { url_search_params } from "src/utils/url";

export const _add_implied_edges_transitive = (
	graph: BCGraph,
	plugin: BreadcrumbsPlugin,
	transitive: BreadcrumbsSettings["implied_relations"]["transitive"][number],
	{ round }: { round: number },
): ImpliedEdgeBuilderResults => {
	const edges: EdgeToAdd[] = [];
	const errors: BreadcrumbsError[] = [];

	if (transitive.rounds < round) {
		return { edges, errors };
	} else if (
		!plugin.settings.edge_fields.find(
			(f) => f.label === transitive.close_field,
		)
	) {
		errors.push({
			code: "invalid_setting_value",
			path: "implied_relations.transitive[].close_field",
			message: `close_field is not a valid BC field: '${transitive.close_field}'`,
		});
		return { edges, errors };
	}

	const implied_kind =
		`transitive:${transitive.name || stringify_transitive_relation(transitive)}` as const;

	graph.forEachNode((start_node) => {
		graph
			.get_attrs_chain_path(
				start_node,
				transitive.chain,
				(e) =>
					// Don't include the current source_id in the path
					e.target_id !== start_node,
				// NOTE: We don't need to check that e.attr.round < round anymore
				// 	since the edges are accumulated and only added at the end
			)
			.forEach((path) => {
				const end_node = path.last()!.target_id;

				const [source_id, target_id] = transitive.close_reversed
					? [end_node, start_node]
					: [start_node, end_node];

				edges.push({
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

	return { edges, errors };
};

// TODO: Move this to a util file
// TODO: Use this in place of the hardcoded implied relation strings (same_sibling_is_sibling, etc.)
export const stringify_transitive_relation = (
	transitive: Pick<
		BreadcrumbsSettings["implied_relations"]["transitive"][number],
		"chain" | "close_field" | "close_reversed"
	>,
) =>
	`[${transitive.chain
		.map((attr) => url_search_params(attr, { trim_lone_param: true }))
		.join(
			", ",
		)}] -> ${transitive.close_field}${transitive.close_reversed ? " (reversed)" : ""}`;
