import type { BCGraph } from "src/graph/MyMultiGraph";
import type { AllFiles } from "src/graph/builders/explicit/files";
import type BreadcrumbsPlugin from "src/main";

/** "Extension" system. Takes in current state of plugin & graph, and adds to the graph */
export type GraphBuilder = (
	graph: BCGraph,
	plugin: BreadcrumbsPlugin,
	all_files: AllFiles,
) => BCGraph;
