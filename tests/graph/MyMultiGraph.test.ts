import { BCGraph } from "src/graph/MyMultiGraph";
import { _mock_edge } from "tests/__mocks__/graph";
import { describe, test } from "vitest";

describe("safe_add_node", () => {
	test("regular", (t) => {
		const g = new BCGraph();

		t.expect(g.safe_add_node("a", { resolved: true })).toBe(true);
	});

	test("duplicate", (t) => {
		const g = new BCGraph();

		g.safe_add_node("a", { resolved: true });

		t.expect(g.safe_add_node("a", { resolved: true })).toBe(false);
	});
});

describe("upsert_node", () => {
	test("add", (t) => {
		const g = new BCGraph();

		g.upsert_node("a", { resolved: true });

		t.expect(g.getNodeAttribute("a", "resolved")).toBe(true);
	});

	test("patch", (t) => {
		const g = new BCGraph();

		g.addNode("a", { resolved: false });

		g.upsert_node("a", { resolved: true });

		t.expect(g.getNodeAttribute("a", "resolved")).toBe(true);
	});
});

describe("safe_rename_node", () => {
	test("regular", (t) => {
		const g = new BCGraph();

		g.addNode("a", { resolved: true });

		const res = g.safe_rename_node("a", "b");

		t.expect(res.ok).toBe(true);
		t.expect(g.hasNode("a")).toBe(false);
		t.expect(g.hasNode("b")).toBe(true);
	});

	test("old_id doesn't exist", (t) => {
		const g = new BCGraph();

		g.addNode("b", { resolved: true });

		const res = g.safe_rename_node("a", "b");

		t.expect(res.ok).toBe(false);
		t.expect(g.hasNode("a")).toBe(false);
		t.expect(g.hasNode("b")).toBe(true);
	});

	test("new_id exists", (t) => {
		const g = new BCGraph();

		g.addNode("a", { resolved: true });
		g.addNode("b", { resolved: true });

		const res = g.safe_rename_node("a", "b");

		t.expect(res.ok).toBe(false);
		t.expect(g.hasNode("a")).toBe(true);
		t.expect(g.hasNode("b")).toBe(true);
	});
});

describe("safe_add_directed_edge", () => {
	test("regular", (t) => {
		const g = new BCGraph();

		g.addNode("a", { resolved: true });
		g.addNode("b", { resolved: true });

		t.expect(
			g.safe_add_directed_edge("a", "b", _mock_edge("a", "b").attr),
		).toBe(true);

		t.expect(g.hasDirectedEdge("a", "b")).toBe(true);
	});

	test("edge exists", (t) => {
		const g = new BCGraph();

		g.addNode("a", { resolved: true });
		g.addNode("b", { resolved: true });

		g.safe_add_directed_edge("a", "b", _mock_edge("a", "b").attr);

		t.expect(
			g.safe_add_directed_edge("a", "b", _mock_edge("a", "b").attr),
		).toBe(false);
	});
});
