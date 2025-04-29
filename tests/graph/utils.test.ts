import { is_self_loop } from "src/graph/utils";
import { _mock_edge } from "tests/__mocks__/graph";
import { describe, test } from "vitest";

describe("is_self_loop", () => {
	test("regular", (t) => {
		t.expect(is_self_loop(_mock_edge("a", "a"))).toBe(true);
	});

	test("different", (t) => {
		t.expect(is_self_loop(_mock_edge("a", "b"))).toBe(false);
	});
});

// const get_edges = () => [
// 	_mock_edge("1/a", "1/b", { field: "a" }),
// 	_mock_edge("1/b", "2/c", { field: "a" }),
// 	_mock_edge("2/c", "2/d", { field: "a" }),
// 	_mock_edge("2/d", "3/e", { field: "a" }),
// ];

// describe("edge_sorter", () => {
// 	test("path", (t) => {
// 		const sorted = get_edges().sort(
// 			get_edge_sorter({ field: "path", order: 1 }),
// 		);
// 	});
// });
