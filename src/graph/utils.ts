import type { GraphEdge } from "src/interfaces/graph";
import type { PathKeepOptions } from "src/interfaces/settings";
import { Path } from "src/utils/paths";

export const is_self_loop = (edge: GraphEdge) =>
	edge.source_id === edge.target_id;

export const stringify_edge = (
	edge: GraphEdge,
	options?: {
		rtl?: boolean;
		edge_id?: boolean;
		path_keep_options?: PathKeepOptions;
	},
) => {
	const source_id = Path.keep(edge.source_id, options?.path_keep_options);
	const target_id = Path.keep(edge.target_id, options?.path_keep_options);

	const edge_id = options?.edge_id ? `(${edge.id})` : null;

	const list = options?.rtl
		? [target_id, "<-", source_id, edge_id]
		: [source_id, "->", target_id, edge_id];

	return list.filter(Boolean).join(" ");
};
