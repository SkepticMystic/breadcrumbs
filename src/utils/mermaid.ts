import type { BCEdge, BCEdgeAttributes } from "src/graph/MyMultiGraph";

const from_edges = (
	edges: (Pick<BCEdge, "source_id" | "target_id"> & {
		attr: Pick<BCEdgeAttributes, "explicit" | "field">;
	})[],
	config?: {
		direction?: "LR" | "TB";
		kind?: "flowchart" | "graph";
	},
) => {
	const { direction, kind } = Object.assign(
		{ direction: "LR", kind: "flowchart" },
		config,
	);

	return (
		`${kind} ${direction}\n` +
		edges
			.map(
				({ source_id, target_id, attr }) =>
					`\t${source_id} ${attr.explicit ? "-->" : "-.->"}|${attr.field}| ${target_id}`,
			)
			.join("\n")
	);
};

export const Mermaid = {
	from_edges,
};
