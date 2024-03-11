import assert from "node:assert";
import test from "node:test";
// import { Traverse } from "../../src/graph/traverse";

// const graph = new BCGraph();

// graph.addDirectedEdge("a", "b");
// graph.addDirectedEdge("a", "c");
// graph.addDirectedEdge("b", "d");
// graph.addDirectedEdge("c", "d");

// test("adds two numbers correctly", () => {
// 	const all_paths = Traverse.all_paths("depth_first", graph, "a").map(
// 		(path) =>
// 			path.map((edge) => ({
// 				source_id: edge.source_id,
// 				target_id: edge.target_id,
// 			})),
// 	);

// 	assert(true);
// 	[
// 		[
// 			{ source_id: "a", target_id: "b" },
// 			{ source_id: "b", target_id: "d" },
// 		],
// 		[
// 			{ source_id: "a", target_id: "c" },
// 			{ source_id: "c", target_id: "d" },
// 		],
// 	];
// });

test("synchronous passing test", (t) => {
	// This test passes because it does not throw an exception.
	assert.strictEqual(1, 1);
});
