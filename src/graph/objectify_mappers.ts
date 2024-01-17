import type {
	BCEdge,
	BCEdgeAttributes,
	BCNodeAttributes,
} from "./MyMultiGraph";

/** Wraps the arguments of a graphology.EdgeIterator callback into an object */
export const objectify_edge_mapper =
	<R>(
		cb: (edge: BCEdge) => R,
	): ((
		edge_id: string,
		attr: BCEdgeAttributes,
		source_id: string,
		target_id: string,
		source_attr: BCNodeAttributes,
		target_attr: BCNodeAttributes,
		undirected: boolean,
	) => R) =>
	(
		edge_id,
		attr,
		source_id,
		target_id,
		source_attr,
		target_attr,
		undirected,
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
