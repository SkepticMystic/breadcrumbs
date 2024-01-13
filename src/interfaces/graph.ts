import type { MultiGraph } from "graphology";
import type { Direction } from "src/const/hierarchies";

export type BreadcrumbsNodeAttributes = {
	/** .md file exists  */
	resolved: boolean;
};

export type BreadcrumbsEdgeAttributes = {
	/** The hierarchy field  */
	field: string;
	/** The direction of the field in the hierarchy */
	dir: Direction;
} & (
	| {
			explicit: true;
			source: "frontmatter:link" | "dataview:inline";
	  }
	| {
			explicit: false;
			implied_kind: "opposite";
	  }
);

export type BreadcrumbsGraph = MultiGraph<
	BreadcrumbsNodeAttributes,
	BreadcrumbsEdgeAttributes
>;

export type GraphNode = {
	id: string;
	attr: BreadcrumbsNodeAttributes;
};

export type GraphEdge = {
	id: string;
	attr: BreadcrumbsEdgeAttributes;
	source_id: string;
	target_id: string;
	source_attr: BreadcrumbsNodeAttributes;
	target_attr: BreadcrumbsNodeAttributes;
	undirected: boolean;
};
