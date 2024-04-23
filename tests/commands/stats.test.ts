import { get_graph_stats } from "src/commands/stats";
import { BCGraph } from "src/graph/MyMultiGraph";
import { _mock_edge } from "tests/__mocks__/graph";
import { describe, expect, test } from "vitest";

describe("get_graph_stats", () => {
	test("straight-line", () => {
		const graph = new BCGraph({
			edges: [
				_mock_edge("a", "b", {}),
				_mock_edge("b", "c", {
					explicit: true,
					field: "parent",
					source: "dataview_note",
				}),
				_mock_edge("c", "d", {
					explicit: false,
					field: "right",
					implied_kind: "transitive:cousin_is_sibling",
					round: 1,
				}),
			],
		});

		const stats = get_graph_stats(graph, {
			groups: [
				{ label: "ups", fields: ["parent"] },
				{ label: "rights", fields: ["right"] },
			],
		});

		expect(stats).toStrictEqual({
			nodes: { resolved: { true: 4 } },
			edges: {
				field: {
					down: 1,
					parent: 1,
					right: 1,
				},
				group: {
					ups: 1,
					rights: 1,
				},
				source: {
					typed_link: 1,
					dataview_note: 1,
				},
				explicit: {
					true: 2,
					false: 1,
				},
				implied_kind: {
					"transitive:cousin_is_sibling": 1,
				},
				round: {
					"1": 1,
				},
			},
		});
	});
});
