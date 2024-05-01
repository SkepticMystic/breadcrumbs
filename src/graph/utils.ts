import {
	COMPLEX_EDGE_SORT_FIELD_PREFIXES,
	type EdgeSortId,
} from "src/const/graph";
import type { ShowNodeOptions } from "src/interfaces/settings";
import { Paths } from "src/utils/paths";
// import type {
// 	BCEdge,
// 	BCEdgeAttributes,
// 	BCNodeAttributes,
// } from "./MyMultiGraph";
import type { EdgeStruct, NodeData } from "wasm/pkg/breadcrumbs_graph_wasm";

// export const is_self_loop = (edge: Pick<BCEdge, "source_id" | "target_id">) =>
// 	edge.source_id === edge.target_id;

export const stringify_node = (
	node: NodeData,
	options?: {
		show_node_options?: ShowNodeOptions;
		trim_basename_delimiter?: string;
	},
) => {
	if (options?.show_node_options?.alias && node.aliases?.length) {
		return node.aliases.at(0)!;
	} else if (options?.trim_basename_delimiter) {
		return Paths.drop_ext(node.path)
			.split("/")
			.pop()!
			.split(options.trim_basename_delimiter)
			.last()!;
	} else {
		return Paths.show(node.path, options?.show_node_options);
	}
};

// UNUSED
// export const stringify_edge = (
// 	edge: BCEdge,
// 	options?: {
// 		rtl?: boolean;
// 		edge_id?: boolean;
// 		show_node_options?: ShowNodeOptions;
// 	},
// ) => {
// 	const source_id = Paths.show(edge.source_id, options?.show_node_options);
// 	const target_id = Paths.show(edge.target_id, options?.show_node_options);

// 	const list = options?.rtl
// 		? [target_id, `<-${edge.attr.field}-`, source_id]
// 		: [source_id, `-${edge.attr.field}->`, target_id];

// 	return list.join(" ");
// };

// TODO: the sorting should probably happen in the WASM code
export type EdgeSorter = (a: EdgeStruct, b: EdgeStruct) => number;

const sorters = {
	path: (order) => (a, b) => a.target.path.localeCompare(b.target.path) * order,

	basename: (order) => (a, b) => {
		const [a_field, b_field] = [
			Paths.drop_folder(a.target.path),
			Paths.drop_folder(b.target.path),
		];

		return a_field.localeCompare(b_field) * order;
	},

	field: (order) => (a, b) => {
		const [a_field, b_field] = [
			a.edge_type ?? "null",
			b.edge_type ?? "null",
		];

		return a_field.localeCompare(b_field) * order;
	},
} satisfies Partial<Record<EdgeSortId["field"], (order: number) => EdgeSorter>>;

export const get_edge_sorter: (
	sort: EdgeSortId,
) => EdgeSorter = (sort) => {
	switch (sort.field) {
		case "path": {
			return sorters.path(sort.order);
		}

		case "basename": {
			return sorters.basename(sort.order);
		}

		case "field": {
			return sorters.field(sort.order);
		}

		case "explicit": {
			return (a, b) => {

				if (a.implied === b.implied) {
					return a.edge_source.localeCompare(b.edge_source) * sort.order;
				} else {
					return a.implied ? -sort.order : sort.order;
				}
			};
		}

		default: {
			// Rather check externally, so this should never happen
			if (
				!COMPLEX_EDGE_SORT_FIELD_PREFIXES.some((f) =>
					sort.field.startsWith(f + ":"),
				)
			) {
				throw new Error(`Invalid sort field: ${sort.field}`);
			}

			switch (sort.field.split(":")[0]) {
				// TODO
				// BREAKING: Deprecate in favour of neighbour-field
				// case "neighbour":
				// case "neighbour-field": {
				// 	const field = sort.field.split(":", 2).at(1);
				// 	const cache: Record<string, BCEdge | undefined> = {};

				// 	return (a, b) => {
				// 		const [a_neighbour, b_neighbour] = [
				// 			(cache[a.target_id] ??= graph
				// 				.get_out_edges(a.target_id)
				// 				.filter((e) => has_edge_attrs(e, { field }))
				// 				.at(0)),

				// 			(cache[b.target_id] ??= graph
				// 				.get_out_edges(b.target_id)
				// 				.filter((e) => has_edge_attrs(e, { field }))
				// 				.at(0)),
				// 		];

				// 		if (!a_neighbour || !b_neighbour) {
				// 			// NOTE: This puts the node with no neighbours last
				// 			// Which makes sense, I think. It simulates a traversal, where the node with no neighbours is the end of the path
				// 			return a_neighbour
				// 				? -sort.order
				// 				: b_neighbour
				// 					? sort.order
				// 					: 0;
				// 		} else {
				// 			return sorters.path(sort.order)(
				// 				a_neighbour,
				// 				b_neighbour,
				// 			);
				// 		}
				// 	};
				// }

				default: {
					return (_a, _b) => sort.order;
				}
			}
		}
	}
};

// export type EdgeAttrFilters = Partial<
// 	Pick<BCEdgeAttributes, "explicit" | "field">
// > &
// 	Partial<{
// 		$or_fields: string[];
// 		$or_target_ids: string[];
// 	}>;

// // NOTE: Technically the source and implied_kind fields could be implemented here, but missions for now
// export const has_edge_attrs = (edge: BCEdge, attrs?: EdgeAttrFilters) =>
// 	attrs === undefined ||
// 	[
// 		attrs.field === undefined || edge.attr.field === attrs.field,
// 		attrs.explicit === undefined || edge.attr.explicit === attrs.explicit,

// 		attrs.$or_fields === undefined ||
// 			attrs.$or_fields.includes(edge.attr.field ?? "null"),
// 		attrs.$or_target_ids === undefined ||
// 			attrs.$or_target_ids.includes(edge.target_id),
// 	].every(Boolean);
