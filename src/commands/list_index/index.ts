import type { Direction } from "src/const/hierarchies";
import type { BCGraph } from "src/graph/MyMultiGraph";
import { Traverse } from "src/graph/traverse";
import type { LinkKind } from "src/interfaces/links";
import type { ShowNodeOptions } from "src/interfaces/settings";

export namespace ListIndex {
	export type Options = {
		dir: Direction;
		hierarchy_i: number;
		indent: string;
		link_kind: LinkKind;
		show_node_options: ShowNodeOptions;
	};

	export const DEFAULT_OPTIONS: Options = {
		dir: "down",
		indent: "\\t",
		hierarchy_i: -1,
		link_kind: "wiki",
		show_node_options: { ext: false, alias: true, folder: false },
	};

	export const build = (
		graph: BCGraph,
		start_node: string,
		options: Options,
	) =>
		Traverse.paths_to_index_list(
			Traverse.all_paths(
				"depth_first",
				graph,
				start_node,
				(e) =>
					e.attr.dir === options.dir &&
					(options.hierarchy_i === -1 ||
						e.attr.hierarchy_i === options.hierarchy_i),
			),
			options,
		);
}
