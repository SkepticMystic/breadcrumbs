import { BCGraph } from "src/graph/MyMultiGraph";
import { Traverse } from "src/graph/traverse";
import { _mock_edge } from "tests/__mocks__/graph";
import { describe, expect, test } from "vitest";

describe("all_paths", () => {
	test("straight-line", (t) => {
		const graph = new BCGraph({
			edges: [
				_mock_edge("a", "b", {}),
				_mock_edge("b", "c", {}),
				_mock_edge("c", "d", {}),
			],
		});

		const all_paths = Traverse.all_paths("depth_first", graph, "a").map(
			(path) =>
				path.map((e) => ({
					source_id: e.source_id,
					target_id: e.target_id,
				})),
		);

		expect(all_paths).toEqual([
			[
				{ source_id: "a", target_id: "b" },
				{ source_id: "b", target_id: "c" },
				{ source_id: "c", target_id: "d" },
			],
		]);
	});

	test("fork", (t) => {
		const graph = new BCGraph({
			edges: [
				_mock_edge("a", "b", {}),
				_mock_edge("b", "c", {}),
				_mock_edge("b", "d", {}),
			],
		});

		const all_paths = Traverse.all_paths("depth_first", graph, "a").map(
			(path) =>
				path.map((e) => ({
					source_id: e.source_id,
					target_id: e.target_id,
				})),
		);

		expect(all_paths).toEqual([
			[
				{ source_id: "a", target_id: "b" },
				{ source_id: "b", target_id: "d" },
			],
			[
				{ source_id: "a", target_id: "b" },
				{ source_id: "b", target_id: "c" },
			],
		]);
	});

	test("diamond", (t) => {
		const graph = new BCGraph({
			edges: [
				_mock_edge("a", "b", {}),
				_mock_edge("b", "c", {}),
				_mock_edge("b", "d", {}),
				_mock_edge("c", "e", {}),
				_mock_edge("d", "e", {}),
			],
		});

		const all_paths = Traverse.all_paths("depth_first", graph, "a").map(
			(path) =>
				path.map((e) => ({
					source_id: e.source_id,
					target_id: e.target_id,
				})),
		);

		expect(all_paths).toEqual([
			[
				{ source_id: "a", target_id: "b" },
				{ source_id: "b", target_id: "d" },
				{ source_id: "d", target_id: "e" },
			],
			[
				{ source_id: "a", target_id: "b" },
				{ source_id: "b", target_id: "c" },
				{ source_id: "c", target_id: "e" },
			],
		]);
	});

	test("loop", (t) => {
		const graph = new BCGraph({
			edges: [
				_mock_edge("a", "b", {}),
				_mock_edge("b", "c", {}),
				_mock_edge("c", "b", {}),
			],
		});

		const all_paths = Traverse.all_paths("depth_first", graph, "a").map(
			(path) =>
				path.map((e) => ({
					source_id: e.source_id,
					target_id: e.target_id,
				})),
		);

		expect(all_paths).toEqual([
			[
				{ source_id: "a", target_id: "b" },
				{ source_id: "b", target_id: "c" },
				{ source_id: "c", target_id: "b" },
				// Then Stop! don't loop back to c then b, and so on
			],
		]);
	});

	// TODO: Different hierarchies shouldn't contribute to the same path
});
