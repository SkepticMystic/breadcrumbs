import {
	COMPLEX_EDGE_SORT_FIELD_PREFIXES,
	type EdgeSortId,
} from "src/const/graph";
import type { Direction } from "src/const/hierarchies";
import type { ShowNodeOptions } from "src/interfaces/settings";
import { Paths } from "src/utils/paths";
import type {
	BCEdge,
	BCEdgeAttributes,
	BCGraph,
	BCNodeAttributes,
} from "./MyMultiGraph";

export const is_self_loop = (edge: Pick<BCEdge, "source_id" | "target_id">) =>
	edge.source_id === edge.target_id;

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

	const list = options?.rtl
		? [target_id, `<-${edge.attr.field}-`, source_id]
		: [source_id, `-${edge.attr.field}->`, target_id];

	return list.join(" ");
};

export type EdgeSorter = (a: BCEdge, b: BCEdge) => number;

const sorters = {
	path: (order) => (a, b) => a.target_id.localeCompare(b.target_id) * order,

	basename: (order) => (a, b) => {
		const [a_field, b_field] = [
			Paths.drop_folder(a.target_id),
			Paths.drop_folder(b.target_id),
		];

		return a_field.localeCompare(b_field) * order;
	},

	field: (order) => (a, b) => {
		const [a_field, b_field] = [
			a.attr.field ?? "null",
			b.attr.field ?? "null",
		];

		return a_field.localeCompare(b_field) * order;
	},
} satisfies Partial<Record<EdgeSortId["field"], (order: number) => EdgeSorter>>;

export const get_edge_sorter: (
	sort: EdgeSortId,
	graph: BCGraph,
) => EdgeSorter = (sort, graph) => {
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
				if (a.attr.explicit === true && b.attr.explicit === true) {
					return (
						a.attr.source.localeCompare(b.attr.source) * sort.order
					);
				} else if (
					a.attr.explicit === false &&
					b.attr.explicit === false
				) {
					return (
						a.attr.implied_kind.localeCompare(b.attr.implied_kind) *
						sort.order
					);
				} else {
					return a.attr.explicit ? sort.order : -sort.order;
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
				// BREAKING: Deprecate in favour of neighbour-field
				case "neighbour":
				case "neighbour-field": {
					const field = sort.field.split(":", 2).at(1);
					const cache: Record<string, BCEdge | undefined> = {};

					return (a, b) => {
						const [a_neighbour, b_neighbour] = [
							(cache[a.target_id] ??= graph
								.get_out_edges(a.target_id)
								.filter((e) => has_edge_attrs(e, { field }))
								.at(0)),

							(cache[b.target_id] ??= graph
								.get_out_edges(b.target_id)
								.filter((e) => has_edge_attrs(e, { field }))
								.at(0)),
						];

						if (!a_neighbour || !b_neighbour) {
							// NOTE: This puts the node with no neighbours last
							// Which makes sense, I think. It simulates a traversal, where the node with no neighbours is the end of the path
							return a_neighbour
								? -sort.order
								: b_neighbour
									? sort.order
									: 0;
						} else {
							return sorters.path(sort.order)(
								a_neighbour,
								b_neighbour,
							);
						}
					};
				}

				// NOTE: Effectively the same result as neighbour-field (since the out_edges are constrained to the given hierarchy)
				// But it lets the user more easily choose a sort sort.order for multiple hierarchies
				case "neighbour-dir": {
					const cache: Record<string, BCEdge | undefined> = {};
					const dir = sort.field.split(":", 2).at(1) as Direction;

					return (a, b) => {
						const [a_neighbour, b_neighbour] = [
							(cache[a.target_id] ??= graph
								.get_out_edges(a.target_id)
								.filter((e) =>
									has_edge_attrs(e, {
										dir,
										hierarchy_i: a.attr.hierarchy_i,
									}),
								)
								.at(0)),

							(cache[b.target_id] ??= graph
								.get_out_edges(b.target_id)
								.filter((e) =>
									has_edge_attrs(e, {
										dir,
										hierarchy_i: b.attr.hierarchy_i,
									}),
								)
								.at(0)),
						];

						if (!a_neighbour || !b_neighbour) {
							// NOTE: This puts the node with no neighbours last
							// Which makes sense, I think. It simulates a traversal, where the node with no neighbours is the end of the path
							return a_neighbour
								? -sort.order
								: b_neighbour
									? sort.order
									: 0;
						} else {
							return sorters.path(sort.order)(
								a_neighbour,
								b_neighbour,
							);
						}
					};
				}

				default: {
					return (_a, _b) => sort.order;
				}
			}
		}
	}
};

export type EdgeAttrFilters = Partial<
	Pick<BCEdgeAttributes, "dir" | "explicit" | "field" | "hierarchy_i">
> &
	Partial<{
		$or_fields: string[];
		$or_dirs: Direction[];
		$or_target_ids: string[];
	}>;

// NOTE: Technically the source and implied_kind fields could be implemented here, but missions for now
export const has_edge_attrs = (edge: BCEdge, attrs?: EdgeAttrFilters) =>
	attrs === undefined ||
	[
		attrs.dir === undefined || edge.attr.dir === attrs.dir,
		attrs.field === undefined || edge.attr.field === attrs.field,
		attrs.explicit === undefined || edge.attr.explicit === attrs.explicit,
		attrs.hierarchy_i === undefined ||
			edge.attr.hierarchy_i === attrs.hierarchy_i,

		attrs.$or_dirs === undefined || attrs.$or_dirs.includes(edge.attr.dir),
		attrs.$or_fields === undefined ||
			attrs.$or_fields.includes(edge.attr.field ?? "null"),
		attrs.$or_target_ids === undefined ||
			attrs.$or_target_ids.includes(edge.target_id),
	].every(Boolean);
