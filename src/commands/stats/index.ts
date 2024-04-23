import type { ExplicitEdgeSource } from "src/const/graph";
import type { BCEdgeAttributes, BCGraph } from "src/graph/MyMultiGraph";
import type { EdgeFieldGroup } from "src/interfaces/settings";

type GraphStats = {
	nodes: {
		resolved: Partial<{
			[key: string]: number;
		}>;
	};

	edges: {
		field: Partial<{
			[key: string]: number;
		}>;

		group: Partial<{
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

		round: Partial<{
			[key: string]: number;
		}>;
	};
};

export const get_graph_stats = (
	graph: BCGraph,
	data: { groups: EdgeFieldGroup[] },
) => {
	const stats: GraphStats = {
		nodes: {
			resolved: {},
		},

		edges: {
			round: {},
			field: {},
			group: {},
			source: {},
			explicit: {},
			implied_kind: {},
		},
	};

	for (const node of graph.nodeEntries()) {
		const resolved = String(node.attributes.resolved);
		stats.nodes.resolved[resolved] =
			(stats.nodes.resolved[resolved] || 0) + 1;
	}

	for (const { attributes: attr } of graph.edgeEntries()) {
		stats.edges.field[attr.field ?? "null"] =
			(stats.edges.field[attr.field ?? "null"] || 0) + 1;

		data.groups.forEach((group) => {
			if (group.fields.includes(attr.field)) {
				stats.edges.group[group.label] =
					(stats.edges.group[group.label] || 0) + 1;
			}
		});

		const explicit = String(attr.explicit);
		stats.edges.explicit[explicit] =
			(stats.edges.explicit[explicit] || 0) + 1;

		if (attr.explicit) {
			stats.edges.source[attr.source] =
				(stats.edges.source[attr.source] || 0) + 1;
		} else {
			stats.edges.implied_kind[attr.implied_kind] =
				(stats.edges.implied_kind[attr.implied_kind] || 0) + 1;

			const round = String(attr.round);
			stats.edges.round[round] = (stats.edges.round[round] || 0) + 1;
		}
	}

	return stats;
};
