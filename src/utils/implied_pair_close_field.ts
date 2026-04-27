import type { BreadcrumbsSettings } from "src/interfaces/settings";

/**
 * For the first single-step transitive implied rule matching `field`, returns
 * `close_field` (e.g. `up` → `down`). Used to add return explicit edges for
 * hierarchy note sources whose primary edge is child → parent only.
 */
export function implied_pair_close_field(
	settings: BreadcrumbsSettings,
	field: string,
): string | undefined {
	for (const rule of settings.implied_relations.transitive) {
		if (
			rule.chain.length === 1 &&
			rule.chain[0]?.field === field &&
			rule.close_field &&
			rule.close_field !== field &&
			settings.edge_fields.some((e) => e.label === rule.close_field)
		) {
			return rule.close_field;
		}
	}
	return undefined;
}
