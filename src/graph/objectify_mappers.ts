import type {
	BreadcrumbsEdgeAttributes,
	BreadcrumbsNodeAttributes,
	GraphEdge,
} from "src/interfaces/graph";

export const objectify_edge_mapper =
	<R>(
		cb: (edge: GraphEdge) => R
	): ((
		edge_id: string,
		attr: BreadcrumbsEdgeAttributes,
		source_id: string,
		target_id: string,
		source_attr: BreadcrumbsNodeAttributes,
		target_attr: BreadcrumbsNodeAttributes,
		undirected: boolean
	) => R) =>
	(
		edge_id,
		attr,
		source_id,
		target_id,
		source_attr,
		target_attr,
		undirected
	) =>
		cb({
			id: edge_id,
			attr,
			source_id,
			target_id,
			source_attr,
			target_attr,
			undirected,
		});
