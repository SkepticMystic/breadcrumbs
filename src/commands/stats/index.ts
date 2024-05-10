import type { EdgeFieldGroup } from "src/interfaces/settings";
import type { EdgeData, NodeData, NoteGraph } from "wasm/pkg/breadcrumbs_graph_wasm";

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
			[key: string]: number;
		}>;

		implied_kind: Partial<{
			[key: string]: number;
		}>;

		round: Partial<{
			[key: string]: number;
		}>;
	};
};

export const get_graph_stats = (
	graph: NoteGraph,
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

	graph.iterate_nodes((node: NodeData) => {
		const resolved = String(node.resolved);
		stats.nodes.resolved[resolved] =
			(stats.nodes.resolved[resolved] || 0) + 1;
	});

	graph.iterate_edges((edge: EdgeData) => {
		stats.edges.field[edge.edge_type] =
			(stats.edges.field[edge.edge_type] || 0) + 1;

		data.groups.forEach((group) => {
			if (group.fields.includes(edge.edge_type)) {
				stats.edges.group[group.label] =
					(stats.edges.group[group.label] || 0) + 1;
			}
		});

		const explicit = String(edge.explicit);
		stats.edges.explicit[explicit] =
			(stats.edges.explicit[explicit] || 0) + 1;

		if (edge.explicit) {
			stats.edges.source[edge.edge_source] =
				(stats.edges.source[edge.edge_source] || 0) + 1;
		} else {
			stats.edges.implied_kind[edge.edge_source] =
				(stats.edges.implied_kind[edge.edge_source] || 0) + 1;

			const round = String(edge.round);
			stats.edges.round[round] = (stats.edges.round[round] || 0) + 1;
		}
	});

	return stats;
};
