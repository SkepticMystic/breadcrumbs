import type { EdgeSortId } from "src/const/graph";
import type { Direction } from "src/const/hierarchies";
import type { EDGE_ATTRIBUTES } from "src/graph/MyMultiGraph";

export type ICodeblock = {
	/** Once resolved, the non-optional fields WILL be there, with a default if missing */
	Options: {
		type: "tree";
		dir: Direction;
		title?: string;
		fields?: string[];
		depth: [number, number];
		flat: boolean;
		dataview_from_paths?: string[];
		content?: "open" | "closed";
		sort: EdgeSortId;
		field_prefix?: boolean;
		show_attributes?: (typeof EDGE_ATTRIBUTES)[number][];
	};
};
