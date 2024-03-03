import type { EdgeSortId } from "src/const/graph";
import type { ShowNodeOptions } from "src/interfaces/settings";
import { Paths } from "src/utils/paths";
import type { BCEdge, BCNodeAttributes } from "./MyMultiGraph";

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

export const dedupe_edges = (edges: BCEdge[]) => {
	const map = new Map<string, BCEdge>();

	for (const e of edges) {
		// I believe this is enough to uniquely identify an edge
		//   going from source to target, explicitly, with a given field.
		//   field implies dir & hierarchy, so we don't need those.
		const key = `${e.source_id}-${e.target_id}-${e.attr.explicit}-${e.attr.field}`;

		if (!map.has(key)) {
			map.set(key, e);
		}
	}

	return [...map.values()];
};

export type EdgeSorter = (a: BCEdge, b: BCEdge) => number;

export const get_edge_sorter: (_: EdgeSortId) => EdgeSorter = ({
	field,
	order,
}) => {
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
	}
};
