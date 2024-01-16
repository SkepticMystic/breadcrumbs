import type {
	BCNodeAttributes,
	GraphEdge,
} from "src/interfaces/graph";
import type { ShowNodeOptions } from "src/interfaces/settings";
import { Path } from "src/utils/paths";

export const is_self_loop = (edge: GraphEdge) =>
	edge.source_id === edge.target_id;

export const stringify_node = (
	node_id: string,
	node_attr: BCNodeAttributes,
	options?: {
		show_node_options?: ShowNodeOptions;
	},
) =>
	options?.show_node_options?.alias && node_attr.aliases?.length
		? node_attr.aliases.at(0)!
		: Path.show(node_id, options?.show_node_options);

export const stringify_edge = (
	edge: GraphEdge,
	options?: {
		rtl?: boolean;
		edge_id?: boolean;
		show_node_options?: ShowNodeOptions;
	},
) => {
	const source_id = Path.show(edge.source_id, options?.show_node_options);
	const target_id = Path.show(edge.target_id, options?.show_node_options);

	const edge_id = options?.edge_id ? `(${edge.id})` : null;

	const list = options?.rtl
		? [target_id, "<-", source_id, edge_id]
		: [source_id, "->", target_id, edge_id];

	return list.filter(Boolean).join(" ");
};
