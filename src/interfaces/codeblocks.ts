import type { EdgeSortId } from "src/const/graph";
import type { EDGE_ATTRIBUTES } from "src/graph/MyMultiGraph";
import type { Mermaid } from "src/utils/mermaid";

export type ICodeblock = {
	/** Once resolved, the non-optional fields WILL be there, with a default if missing */
	Options: {
		type: "tree" | "mermaid";
		title?: string;
		fields?: string[];
		depth: [number, number];
		flat: boolean;
		collapse?: boolean;
		merge_fields?: boolean;
		merge_hierarchies?: boolean;
		dataview_from_paths?: string[];
		content?: "open" | "closed";
		sort: EdgeSortId;
		field_prefix?: boolean;
		show_attributes?: (typeof EDGE_ATTRIBUTES)[number][];
		// mermaid
		mermaid_direction?: Mermaid["Direction"];
		mermaid_renderer?: Mermaid["Renderer"];
		// TODO: Use subgraphs to show folders: https://mermaid.js.org/syntax/flowchart.html#subgraphs
		// mermaid_subgraphs?: "folders"
	};
};
