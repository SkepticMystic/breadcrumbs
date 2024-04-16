import type { BCEdgeAttributes, BCGraph } from "src/graph/MyMultiGraph";
import type { AllFiles } from "src/graph/builders/explicit/files";
import type BreadcrumbsPlugin from "src/main";
import type { MaybePromise } from ".";

export type BreadcrumbsError = {
	// TODO: Differentiate between invalid edge-field and invalid metadata-field values
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

/** The values passed into safe_add_edge */
export type EdgeToAdd = {
	source_id: string;
	target_id: string;
	attr: BCEdgeAttributes;
};

export type ImpliedEdgeBuilderResults = {
	edges: EdgeToAdd[];
	errors: BreadcrumbsError[];
};
