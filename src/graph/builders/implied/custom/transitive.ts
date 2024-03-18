import type { BCGraph } from "src/graph/MyMultiGraph";
import type { BreadcrumbsSettings } from "src/interfaces/settings";
import type BreadcrumbsPlugin from "src/main";
import { get_field_hierarchy } from "src/utils/hierarchies";

export const _add_implied_edges_custom_transitive = (
	graph: BCGraph,
	plugin: BreadcrumbsPlugin,
	transitive: BreadcrumbsSettings["custom_implied_relations"]["transitive"][number],
	{ round }: { round: number },
) => {
	if (transitive.rounds < round) {
		return {};
	}

	const field_hierarchy = get_field_hierarchy(
		plugin.settings.hierarchies,
		transitive.close_field,
	);
	if (!field_hierarchy) {
		// TODO: This seems like justification enough for ImpliedEdgeBuilders to return an errors array like the explicit ones
		console.warn(
			`Couldn't find hierarchy for transitive.close_field: ${transitive.close_field}`,
		);
		return {};
	}

	graph.forEachNode((source_id) => {
		graph
			.get_attrs_chain_path(
				source_id,
				transitive.chain,
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
						explicit: false,
						dir: field_hierarchy.dir,
						field: transitive.close_field,
						hierarchy_i: field_hierarchy.hierarchy_i,
						implied_kind: `custom_transitive:${stringify_transitive_relation(
							transitive,
						)}`,
					},
				);
			});
	});

	return {};
};

// TODO: Move this to a util file
// TODO: Use this in place of the hardcoded implied relation strings (same_sibling_is_sibling, etc.)
export const stringify_transitive_relation = (
	transitive: BreadcrumbsSettings["custom_implied_relations"]["transitive"][number],
) =>
	`[${transitive.chain
		.map((attr) => {
			const fields: string[] = [];

			if (attr.dir) fields.push(`dir:${attr.dir}`);
			if (attr.field) fields.push(`field:${attr.field}`);
			if (attr.hierarchy_i !== undefined)
				fields.push(`hierarchy_i:${attr.hierarchy_i}`);

			return fields.join("|");
		})
		.join(", ")}] -> ${transitive.close_field}`;
