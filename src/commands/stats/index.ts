import type { ExplicitEdgeSource } from "src/const/graph";
import type { Direction } from "src/const/hierarchies";
import type { BCEdgeAttributes, BCGraph } from "src/graph/MyMultiGraph";

type GraphStats = {
	nodes: {
		resolved: Partial<{
			[key: string]: number;
		}>;
	};

	edges: {
		hierarchy_i: Partial<{
			[key: string]: number;
		}>;

		direction: Partial<{
			[key in Direction]: number;
		}>;

		field: Partial<{
			[key: string]: number;
		}>;

		explicit: Partial<{
			[key: string]: number;
		}>;

		source: Partial<{
			[key in ExplicitEdgeSource]: number;
		}>;

		implied_kind: Partial<{
			[key in Extract<
				BCEdgeAttributes,
				{ explicit: false }
			>["implied_kind"]]: number;
		}>;
	};
};

export const get_graph_stats = (graph: BCGraph) => {
	const stats: GraphStats = {
		nodes: {
			resolved: {},
		},

		edges: {
			field: {},
			source: {},
			explicit: {},
			direction: {},
			hierarchy_i: {},
			implied_kind: {},
		},
	};

	for (const node of graph.nodeEntries()) {
		const resolved = String(node.attributes.resolved);
		stats.nodes.resolved[resolved] =
			(stats.nodes.resolved[resolved] || 0) + 1;
	}

	for (const { attributes } of graph.edgeEntries()) {
		stats.edges.hierarchy_i[attributes.hierarchy_i] =
			(stats.edges.hierarchy_i[attributes.hierarchy_i] || 0) + 1;

		stats.edges.direction[attributes.dir] =
			(stats.edges.direction[attributes.dir] || 0) + 1;

		stats.edges.field[attributes.field ?? "null"] =
			(stats.edges.field[attributes.field ?? "null"] || 0) + 1;

		if (attributes.explicit) {
			stats.edges.source[attributes.source] =
				(stats.edges.source[attributes.source] || 0) + 1;
		} else {
			stats.edges.implied_kind[attributes.implied_kind] =
				(stats.edges.implied_kind[attributes.implied_kind] || 0) + 1;
		}

		const explicit = String(attributes.explicit);
		stats.edges.explicit[explicit] =
			(stats.edges.explicit[explicit] || 0) + 1;
	}

	return stats;
};
