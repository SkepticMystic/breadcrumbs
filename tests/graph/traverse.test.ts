import { BCGraph } from "src/graph/MyMultiGraph";
import { Traverse } from "src/graph/traverse";
import { _mock_edge } from "tests/__mocks__/graph";
import { describe, expect, test } from "vitest";

// TODO: This isn't the _best_ way to test these traversal functions
// But it does make writing the target data simpler
describe("all_paths", () => {
	test("straight-line", () => {
		const graph = new BCGraph({
			edges: [
				_mock_edge("a", "b", {}),
				_mock_edge("b", "c", {}),
				_mock_edge("c", "d", {}),
			],
		});

		const edges = Traverse.flatten_tree(
			Traverse.build_tree(graph, "a", {}),
		).map((item) => ({
			source_id: item.edge.source_id,
			target_id: item.edge.target_id,
		}));

		expect(edges).toStrictEqual([
			{ source_id: "a", target_id: "b" },
			{ source_id: "b", target_id: "c" },
			{ source_id: "c", target_id: "d" },
		]);
	});

	test("fork", () => {
		const graph = new BCGraph({
			edges: [
				_mock_edge("a", "b", {}),
				_mock_edge("b", "c", {}),
				_mock_edge("b", "d", {}),
			],
		});

		const edges = Traverse.flatten_tree(
			Traverse.build_tree(graph, "a", {}),
		).map((item) => ({
			source_id: item.edge.source_id,
			target_id: item.edge.target_id,
		}));

		expect(edges).toEqual([
			{ source_id: "a", target_id: "b" },
			{ source_id: "b", target_id: "c" },
			{ source_id: "b", target_id: "d" },
		]);
	});

	test("diamond", () => {
		const graph = new BCGraph({
			edges: [
				_mock_edge("a", "b", {}),
				_mock_edge("b", "c", {}),
				_mock_edge("b", "d", {}),
				_mock_edge("c", "e", {}),
				_mock_edge("d", "e", {}),
			],
		});

		const edges = Traverse.flatten_tree(
			Traverse.build_tree(graph, "a", {}),
		).map((item) => ({
			source_id: item.edge.source_id,
			target_id: item.edge.target_id,
		}));

		expect(edges).toEqual([
			{ source_id: "a", target_id: "b" },
			{ source_id: "b", target_id: "c" },
			{ source_id: "c", target_id: "e" },
			{ source_id: "b", target_id: "d" },
			{ source_id: "d", target_id: "e" },
		]);
	});

	test("loop", () => {
		const graph = new BCGraph({
			edges: [
				_mock_edge("a", "b", {}),
				_mock_edge("b", "c", {}),
				_mock_edge("c", "b", {}),
			],
		});

		const edges = Traverse.flatten_tree(
			Traverse.build_tree(graph, "a", {}),
		).map((item) => ({
			source_id: item.edge.source_id,
			target_id: item.edge.target_id,
		}));

		expect(edges).toEqual([
			{ source_id: "a", target_id: "b" },
			{ source_id: "b", target_id: "c" },
			{ source_id: "c", target_id: "b" },
		]);
	});

	// TODO: Different hierarchies shouldn't contribute to the same path
});
