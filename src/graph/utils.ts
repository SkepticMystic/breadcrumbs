import type { ShowNodeOptions } from "src/interfaces/settings";
import { Paths } from "src/utils/paths";
import type { NodeData } from "wasm/pkg/breadcrumbs_graph_wasm";
import type { BCEdgeAttributes } from "./MyMultiGraph";

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

export type EdgeAttrFilters = Partial<
	Pick<BCEdgeAttributes, "explicit" | "field">
> &
	Partial<{
		$or_fields: string[];
		$or_target_ids: string[];
	}>;
