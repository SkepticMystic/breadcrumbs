import type { MultiGraph } from "graphology";
import type { Direction } from "src/const/hierarchies";
import type { ObsidianOrDataviewFiles } from "src/graph/builders/explicit/files";
import type BreadcrumbsPlugin from "src/main";
import type { Hierarchy } from "./hierarchies";

export type BreadcrumbsNodeAttributes = {
	/** .md file exists  */
	resolved: boolean;
	aliases?: string[];
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
			source: // Just a regular `up: [[link]]` or `down:: [[link]]` in the content/frontmatter of a note
			// The two are not distinguished, because Dataview doesn't distinguish them
			"typed_link";
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
	plugin: BreadcrumbsPlugin,
	obsidian_or_dataview_files: ObsidianOrDataviewFiles,
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
