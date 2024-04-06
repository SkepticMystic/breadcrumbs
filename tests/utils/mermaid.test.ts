import { Mermaid } from "src/utils/mermaid";
import { _mock_edge } from "tests/__mocks__/graph";
import { describe, test } from "vitest";

describe("from_edges", () => {
	test("should create a mermaid flowchart from edges", (t) => {
		t.expect(
			Mermaid.from_edges([
				_mock_edge("a.md", "b.md", { explicit: true, field: "up" }),
				_mock_edge("b.md", "c.md", { explicit: false, field: "down" }),
			]).trim(),
		).toBe(
			`
%%{init: {"flowchart": {"defaultRenderer": "dagre"}} }%%
flowchart LR
\ta.md("a") --> b.md("b")
\tb.md("b") -.-> c.md("c")`.trimStart(),
		);
	});
});

// TODO: I need to test more cases here
