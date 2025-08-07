import { build_list_index } from "src/commands/list_index";
import { describe, expect, test, beforeEach } from "vitest";
import init, {
	create_graph,
	GCEdgeData,
	GCNodeData,
} from "wasm/pkg/breadcrumbs_graph_wasm";
import fs from "node:fs/promises";

function getEdges() {
	return [
		new GCEdgeData("index.md", "1.md", "down", ""),
		new GCEdgeData("1.md", "1.1.md", "down", ""),
		new GCEdgeData("1.1.md", "1.1.1.md", "down", ""),
		new GCEdgeData("1.1.md", "1.1.2.md", "down", ""),
		new GCEdgeData("1.md", "1.2.md", "down", ""),
		new GCEdgeData("1.2.md", "1.2.1.md", "down", ""),
		new GCEdgeData("1.2.md", "1.2.2.md", "down", ""),
		new GCEdgeData("index.md", "2.md", "down", ""),
		new GCEdgeData("2.md", "2.1.md", "down", ""),
		new GCEdgeData("2.1.md", "2.1.1.md", "down", ""),
		new GCEdgeData("2.1.md", "2.1.2.md", "down", ""),
		new GCEdgeData("2.md", "2.2.md", "down", ""),
		new GCEdgeData("2.2.md", "2.2.1.md", "down", ""),
		new GCEdgeData("2.2.md", "2.2.2.md", "down", ""),
	];
}

function getNodes() {
	return [
		new GCNodeData("index.md", [], true, false, false),
		new GCNodeData("1.md", [], true, false, false),
		new GCNodeData("1.1.md", [], true, false, false),
		new GCNodeData("1.1.1.md", [], true, false, false),
		new GCNodeData("1.1.2.md", [], true, false, false),
		new GCNodeData("1.2.md", [], true, false, false),
		new GCNodeData("1.2.1.md", [], true, false, false),
		new GCNodeData("1.2.2.md", [], true, false, false),
		new GCNodeData("2.md", [], true, false, false),
		new GCNodeData("2.1.md", [], true, false, false),
		new GCNodeData("2.1.1.md", [], true, false, false),
		new GCNodeData("2.1.2.md", [], true, false, false),
		new GCNodeData("2.2.md", [], true, false, false),
		new GCNodeData("2.2.1.md", [], true, false, false),
		new GCNodeData("2.2.2.md", [], true, false, false),
	];
}

beforeEach(async () => {
	const wasmSource = await fs.readFile(
		"wasm/pkg/breadcrumbs_graph_wasm_bg.wasm",
	);
	// @ts-ignore TS2345
	const wasmModule = await WebAssembly.compile(wasmSource);
	await init(wasmModule);
});

describe("build", () => {
	test("binary-tree > defaults", () => {
		const graph = create_graph();
		graph.build_graph(getNodes(), getEdges(), []);

		const list_index = build_list_index(graph, "index.md", undefined, {
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
		const graph = create_graph();
		graph.build_graph(getNodes(), getEdges(), []);

		const list_index = build_list_index(graph, "index.md", undefined, {
			indent: ".",
			fields: ["down"],
			link_kind: "wiki",
			field_group_labels: [],
			show_attributes: ["field", "explicit"],
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
