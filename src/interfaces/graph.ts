import type { BCGraph } from "src/graph/MyMultiGraph";
import type { AllFiles } from "src/graph/builders/explicit/files";
import type BreadcrumbsPlugin from "src/main";
import type { MaybePromise } from ".";

export type BreadcrumbsError = {
	code: "deprecated_field" | "invalid_field_value" | "invalid_setting_value";
	message: string;
	path: string;
};

// TODO: A completely different approach is to do it on a single node level
//   This way, we could rebuild the edges for a particular node as needed
/** "Extension" system. Takes in current state of plugin & graph, and adds to the graph */
export type ExplicitEdgeBuilder = (
	graph: BCGraph,
	plugin: BreadcrumbsPlugin,
	all_files: AllFiles,
) => MaybePromise<{
	errors: BreadcrumbsError[];
}>;

export type ImpliedEdgeBuilder = (
	graph: BCGraph,
	plugin: BreadcrumbsPlugin,
	options: { round: number },
) => {};
