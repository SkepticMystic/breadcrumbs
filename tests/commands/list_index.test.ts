import { ListIndex } from "src/commands/list_index";
import { BCGraph } from "src/graph/MyMultiGraph";
import { _mock_edge } from "tests/__mocks__/graph";
import { describe, expect, test } from "vitest";

describe("build", () => {
	test("binary-tree", () => {
		const graph = new BCGraph({
			edges: [
				_mock_edge("index.md", "1.md", {}),
				_mock_edge("1.md", "1.1.md", {}),
				_mock_edge("1.1.md", "1.1.1.md", {}),
				_mock_edge("1.1.md", "1.1.2.md", {}),
				_mock_edge("1.md", "1.2.md", {}),
				_mock_edge("1.2.md", "1.2.1.md", {}),
				_mock_edge("1.2.md", "1.2.2.md", {}),
				_mock_edge("index.md", "2.md", {}),
				_mock_edge("2.md", "2.1.md", {}),
				_mock_edge("2.1.md", "2.1.1.md", {}),
				_mock_edge("2.1.md", "2.1.2.md", {}),
				_mock_edge("2.md", "2.2.md", {}),
				_mock_edge("2.2.md", "2.2.1.md", {}),
				_mock_edge("2.2.md", "2.2.2.md", {}),
			],
		});

		const list_index = ListIndex.build(graph, "index.md", {
			indent: " ",
			dir: "down",
			hierarchy_i: -1,
			link_kind: "none",
			edge_sort_id: {
				order: 1,
				field: "basename",
			},
			show_node_options: {
				ext: false,
				alias: false,
				folder: false,
			},
		});

		expect(list_index).toBe(
			[
				"- 1",
				" - 1.1",
				"  - 1.1.1",
				"  - 1.1.2",
				" - 1.2",
				"  - 1.2.1",
				"  - 1.2.2",
				"- 2",
				" - 2.1",
				"  - 2.1.1",
				"  - 2.1.2",
				" - 2.2",
				"  - 2.2.1",
				"  - 2.2.2",
				"",
			].join("\n"),
		);
	});
});
