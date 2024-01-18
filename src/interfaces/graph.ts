import type { BCGraph } from "src/graph/MyMultiGraph";
import type { AllFiles } from "src/graph/builders/explicit/files";
import type BreadcrumbsPlugin from "src/main";

export type GraphError = {
	code: string;
	message: string;
	path: string;
};

/** "Extension" system. Takes in current state of plugin & graph, and adds to the graph */
export type ExplicitEdgeBuilder = (
	graph: BCGraph,
	plugin: BreadcrumbsPlugin,
	all_files: AllFiles,
) => {
	errors: GraphError[];
};

export type ImpliedEdgeBuilder = (
	graph: BCGraph,
	plugin: BreadcrumbsPlugin,
	all_files: AllFiles,
) => {};
