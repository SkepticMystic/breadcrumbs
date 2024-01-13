import type { MultiGraph } from "graphology";
import type { Direction } from "src/const/hierarchies";
import type BreadcrumbsPlugin from "src/main";
import type { Hierarchy } from "./hierarchies";

export type BreadcrumbsNodeAttributes = {
	/** .md file exists  */
	resolved: boolean;
};

export type BreadcrumbsEdgeAttributes = {
	/** The hierarchy index */
	hierarchy_i: number;
	/** The direction of the field in the hierarchy */
	dir: Direction;
	/** The hierarchy field  */
	field: string;
} & (
	| {
			explicit: true;
			source: "frontmatter:link" | "dataview:inline";
	  }
	| {
			explicit: false;
			implied_kind: keyof Hierarchy["implied_relationships"];
	  }
);

export type BreadcrumbsGraph = MultiGraph<
	BreadcrumbsNodeAttributes,
	BreadcrumbsEdgeAttributes
>;

/** "Extension" system. Takes in current state of plugin & graph, and adds to the graph */
export type GraphBuilder = (
	graph: BreadcrumbsGraph,
	plugin: BreadcrumbsPlugin
) => BreadcrumbsGraph;

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
