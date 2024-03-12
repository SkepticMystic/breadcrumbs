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
					dir: "up",
					explicit: true,
					field: "parent",
					hierarchy_i: 1,
					source: "dataview_note",
				}),
				_mock_edge("c", "d", {
					dir: "next",
					explicit: false,
					field: "right",
					hierarchy_i: 2,
					implied_kind: "cousin_is_sibling",
					round: 1,
				}),
			],
		});

		const stats = get_graph_stats(graph);

		expect(stats).toStrictEqual({
			nodes: { resolved: { true: 4 } },
			edges: {
				field: {
					child: 1,
					parent: 1,
					right: 1,
				},
				source: {
					typed_link: 1,
					dataview_note: 1,
				},
				explicit: {
					true: 2,
					false: 1,
				},
				direction: {
					down: 1,
					up: 1,
					next: 1,
				},
				hierarchy_i: {
					"0": 1,
					"1": 1,
					"2": 1,
				},
				implied_kind: {
					cousin_is_sibling: 1,
				},
			},
		});
	});
});
