import type { EdgeSorter } from "src/const/graph";
import type { Direction } from "src/const/hierarchies";

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
		sort: EdgeSorter;
	};
};
