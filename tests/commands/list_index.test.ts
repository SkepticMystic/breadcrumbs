import { ListIndex } from "src/commands/list_index";
import { BCGraph } from "src/graph/MyMultiGraph";
import { _mock_edge } from "tests/__mocks__/graph";
import { describe, expect, test } from "vitest";

const edges = [
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
];

describe("build", () => {
	test("binary-tree > defaults", () => {
		const graph = new BCGraph({ edges });

		const list_index = ListIndex.build(graph, "index.md", {
			indent: " ",
			fields: ["down"],
			show_attributes: [],
			field_group_labels: [],
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

	test("binary-tree > indent + show-attributes + link_kind + edge_sort_id", () => {
		const graph = new BCGraph({ edges });

		const list_index = ListIndex.build(graph, "index.md", {
			indent: ".",
			fields: ["down"],
			link_kind: "wiki",
			field_group_labels: [],
			show_attributes: ["explicit", "field"],
			edge_sort_id: {
				order: -1,
				field: "basename",
			},
			show_node_options: {
				ext: true,
				alias: false,
				folder: false,
			},
		});

		expect(list_index).toBe(
			[
				"- [[2]] (field=down explicit=true)",
				".- [[2.2]] (field=down explicit=true)",
				"..- [[2.2.2]] (field=down explicit=true)",
				"..- [[2.2.1]] (field=down explicit=true)",
				".- [[2.1]] (field=down explicit=true)",
				"..- [[2.1.2]] (field=down explicit=true)",
				"..- [[2.1.1]] (field=down explicit=true)",
				"- [[1]] (field=down explicit=true)",
				".- [[1.2]] (field=down explicit=true)",
				"..- [[1.2.2]] (field=down explicit=true)",
				"..- [[1.2.1]] (field=down explicit=true)",
				".- [[1.1]] (field=down explicit=true)",
				"..- [[1.1.2]] (field=down explicit=true)",
				"..- [[1.1.1]] (field=down explicit=true)",
				"",
			].join("\n"),
		);
	});
});
