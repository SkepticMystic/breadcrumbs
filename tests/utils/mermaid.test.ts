import { Mermaid } from "src/utils/mermaid";
import { _mock_edge } from "tests/__mocks__/graph";
import { describe, test } from "vitest";

describe("from_edges", () => {
	test("should create a mermaid flowchart from edges", (t) => {
		t.expect(
			Mermaid.from_edges([
				_mock_edge("a", "b", { explicit: true, field: "up" }),
				_mock_edge("b", "c", { explicit: false, field: "down" }),
			]),
		).toBe(
			`
flowchart LR
\ta -->|up| b
\tb -.->|down| c`.trimStart(),
		);
	});
});
