import type BreadcrumbsPlugin from "src/main";
import type { ShowNodeOptions } from "src/interfaces/settings";
import { NodeStringifyOptions } from "wasm/pkg/breadcrumbs_graph_wasm";

export function toNodeStringifyOptions(
	plugin: BreadcrumbsPlugin,
	options: ShowNodeOptions,
): NodeStringifyOptions {
	const { dendron_note } = plugin.settings.explicit_edge_sources;

	return new NodeStringifyOptions(
		options.ext,
		options.folder,
		options.alias,
		dendron_note.enabled && dendron_note.display_trimmed
			? dendron_note.delimiter
			: undefined,
	);
}

export type EdgeAttrFilters = Partial<
	Pick<BCEdgeAttributes, "explicit" | "field">
> &
	Partial<{
		$or_fields: string[];
		$or_target_ids: string[];
	}>;

import type { ExplicitEdgeSource } from "src/const/graph";

export const EDGE_ATTRIBUTES = [
	"field",
	"explicit",
	"source",
	"implied_kind",
	"round",
] as const;

export type EdgeAttribute = (typeof EDGE_ATTRIBUTES)[number];

export type BCEdgeAttributes = {
	field: string;
} & (
	| {
			explicit: true;
			source: ExplicitEdgeSource;
	  }
	| {
			explicit: false;
			implied_kind: `transitive:${string}`;
			/** Which round of implied_building this edge got added in.
			 * Starts at 1 - you can think of real edges as being added in round 0.
			 * The way {@link BCGraph.safe_add_directed_edge} works, currently only the first instance of an edge will be added.
			 *   If the same edge tries again in a future round, _that_ one will be blocked.
			 */
			round: number;
	  }
);
