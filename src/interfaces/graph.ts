import type { MultiGraph } from "graphology";

type BreadcrumbsNodeAttributes = {
	/** .md file exists  */
	resolved: boolean;
};

type BreadcrumbsEdgeAttributes = {
	/** The hierarchy field  */
	field: string;
} & (
	| {
			explicit: true;
			source: "frontmatter:link" | "dataview:inline";
	  }
	| {
			explicit: false;
			// TODO: Flesh out the implied_kind type
			implied_kind: string;
	  }
);

export type BreadcrumbsGraph = MultiGraph<
	BreadcrumbsNodeAttributes,
	BreadcrumbsEdgeAttributes
>;
