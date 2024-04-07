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
\t0("a.md")
\t1("b.md")
\t2("c.md")

\t0 --> 1
\t1 -.-> 2`.trimStart(),
		);
	});
});

// TODO: I need to test more cases here
