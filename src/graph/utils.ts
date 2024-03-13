import {
	COMPLEX_EDGE_SORT_FIELD_PREFIXES,
	type EdgeSortId,
} from "src/const/graph";
import type { ShowNodeOptions } from "src/interfaces/settings";
import { Paths } from "src/utils/paths";
import type {
	BCEdge,
	BCEdgeAttributes,
	BCGraph,
	BCNodeAttributes,
} from "./MyMultiGraph";
import { objectify_edge_mapper } from "./objectify_mappers";

export const is_self_loop = (edge: BCEdge) => edge.source_id === edge.target_id;

export const stringify_node = (
	node_id: string,
	node_attr: BCNodeAttributes,
	options?: {
		show_node_options?: ShowNodeOptions;
		trim_basename_delimiter?: string;
	},
) => {
	if (options?.show_node_options?.alias && node_attr.aliases?.length) {
		return node_attr.aliases.at(0)!;
	} else if (options?.trim_basename_delimiter) {
		return Paths.drop_ext(node_id)
			.split("/")
			.pop()!
			.split(options.trim_basename_delimiter)
			.last()!;
	} else {
		return Paths.show(node_id, options?.show_node_options);
	}
};
export const stringify_edge = (
	edge: BCEdge,
	options?: {
		rtl?: boolean;
		edge_id?: boolean;
		show_node_options?: ShowNodeOptions;
	},
) => {
	const source_id = Paths.show(edge.source_id, options?.show_node_options);
	const target_id = Paths.show(edge.target_id, options?.show_node_options);

	const edge_id = options?.edge_id ? `(${edge.id})` : null;

	const list = options?.rtl
		? [target_id, "<-", source_id, edge_id]
		: [source_id, "->", target_id, edge_id];

	return list.filter(Boolean).join(" ");
};

export type EdgeSorter = (a: BCEdge, b: BCEdge) => number;

export const get_edge_sorter: (_: EdgeSortId, graph: BCGraph) => EdgeSorter = (
	{ field, order },
	graph,
) => {
	switch (field) {
		case "default": {
			return (_a, _b) => order;
		}

		case "path": {
			return (a, b) => {
				const [a_field, b_field] = [a.target_id, b.target_id];

				return a_field.localeCompare(b_field) * order;
			};
		}

		case "basename": {
			return (a, b) => {
				const [a_field, b_field] = [
					Paths.drop_folder(a.target_id),
					Paths.drop_folder(b.target_id),
				];

				return a_field.localeCompare(b_field) * order;
			};
		}

		case "field": {
			return (a, b) => {
				const [a_field, b_field] = [
					a.attr.field ?? "null",
					b.attr.field ?? "null",
				];

				return a_field.localeCompare(b_field) * order;
			};
		}

		default: {
			// Rather check externally, so this should never happen
			if (
				!COMPLEX_EDGE_SORT_FIELD_PREFIXES.some((f) =>
					field.startsWith(f + ":"),
				)
			) {
				throw new Error(`Invalid sort field: ${field}`);
			}

			switch (field.split(":")[0]) {
				case "neighbour": {
					const neighbour_field = field.split(":", 2).at(1);
					const cache: Record<string, BCEdge | undefined> = {};

					return (a, b) => {
						const [a_neighbour, b_neighbour] = [
							(cache[a.target_id] ??= graph
								.mapOutEdges(
									a.target_id,
									objectify_edge_mapper((e) => e),
								)
								.filter((e) => e.attr.field === neighbour_field)
								.at(0)),
							(cache[b.target_id] ??= graph
								.mapOutEdges(
									b.target_id,
									objectify_edge_mapper((e) => e),
								)
								.filter((e) => e.attr.field === neighbour_field)
								.at(0)),
						];

						if (!a_neighbour || !b_neighbour) {
							return a_neighbour
								? order
								: b_neighbour
									? -order
									: 0;
						} else {
							return (
								a_neighbour.target_id.localeCompare(
									b_neighbour.target_id,
								) * order
							);
						}
					};
				}

				default: {
					return (_a, _b) => order;
				}
			}
		}
	}
};

// TODO: Actually use where needed
// NOTE: Technically the source and implied_kind fields could be implemented here, but missions for now
export const has_edge_attrs = (
	edge: BCEdge,
	attrs: Partial<
		Pick<BCEdgeAttributes, "dir" | "explicit" | "field" | "hierarchy_i">
	>,
) =>
	(attrs.hierarchy_i === undefined ||
		edge.attr.hierarchy_i === attrs.hierarchy_i) &&
	(attrs.dir === undefined || edge.attr.dir === attrs.dir) &&
	(attrs.field === undefined || edge.attr.field === attrs.field) &&
	(attrs.explicit === undefined || edge.attr.explicit === attrs.explicit);
