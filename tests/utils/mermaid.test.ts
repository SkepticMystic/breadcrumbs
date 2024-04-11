import { Mermaid } from "src/utils/mermaid";
import { _mock_edge } from "tests/__mocks__/graph";
import { describe, test } from "vitest";

describe("from_edges", () => {
	const edges = [
		_mock_edge("a.md", "b.md", { explicit: true, field: "up" }),
		_mock_edge("b.md", "c.md", { explicit: false, field: "down" }),
	];

	test("!config", (t) => {
		t.expect(Mermaid.from_edges(edges).trim()).toBe(
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

	test("config.kind,direction,renderer", (t) => {
		t.expect(
			Mermaid.from_edges(edges, {
				kind: "graph",
				direction: "TB",
				renderer: "elk",
			}).trim(),
		).toBe(
			`
%%{init: {"flowchart": {"defaultRenderer": "elk"}} }%%
graph TB
\t0("a.md")
\t1("b.md")
\t2("c.md")

\t0 --> 1
\t1 -.-> 2`.trimStart(),
		);
	});

	test("config.show_attributes", (t) => {
		t.expect(
			Mermaid.from_edges(edges, { show_attributes: ["field"] }).trim(),
		).toBe(
			`
%%{init: {"flowchart": {"defaultRenderer": "dagre"}} }%%
flowchart LR
\t0("a.md")
\t1("b.md")
\t2("c.md")

\t0 -->|"up"| 1
\t1 -.->|"down"| 2`.trimStart(),
		);
	});

	test("config.click.class", (t) => {
		t.expect(
			Mermaid.from_edges(edges, { click: { method: "class" } }).trim(),
		).toBe(
			`
%%{init: {"flowchart": {"defaultRenderer": "dagre"}} }%%
flowchart LR
\t0("a.md")
\t1("b.md")
\t2("c.md")

\t0 --> 1
\t1 -.-> 2

\tclass 0,1,2 internal-link`.trimStart(),
		);
	});
});

// TODO: I need to test more cases here
