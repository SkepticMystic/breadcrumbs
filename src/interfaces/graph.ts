import type { MultiGraph } from "graphology";

type BreadcrumbsEdgeAttributes = {
	// The "kind" of link (from user hierarchies)
	field: string;
} & (
	| {
			real: true;
			source: "frontmatter:link" | "dataview:inline";
	  }
	| {
			real: false;
			// TODO: Flesh out the implied_kind type
			implied_kind: string;
	  }
);

export type BreadcrumbsGraph = MultiGraph<
	// NodeAttributes
	{},
	// EdgeAttributes
	BreadcrumbsEdgeAttributes
>;
