import type { GraphEdge } from "src/interfaces/graph";
import { drop_folder_ext } from "src/utils/paths";

export const is_self_loop = (edge: GraphEdge) =>
	edge.source_id === edge.target_id;

export const stringify_edge = (
	edge: GraphEdge,
	options?: { keep_folder_ext?: boolean; edge_id?: boolean }
) => {
	const source_id = options?.keep_folder_ext
		? edge.source_id
		: drop_folder_ext(edge.source_id);

	const target_id = options?.keep_folder_ext
		? edge.target_id
		: drop_folder_ext(edge.target_id);

	return [
		source_id,
		"->",
		target_id,
		options?.edge_id ? `(${edge.id})` : null,
	]
		.filter(Boolean)
		.join(" ");
};
