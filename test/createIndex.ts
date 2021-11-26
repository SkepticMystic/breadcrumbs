import { MultiGraph } from "graphology";
import { getReflexiveClosure } from "../src/graphUtils";

require("approvals").mocha();

describe("When running some tests", function () {
  it("should be able to use Approvals", function () {
    const userHiers = [
      {
        down: ["down"],
        next: ["next"],
        prev: ["prev"],
        same: ["same"],
        up: ["up", "parent"],
      },
    ];

    const g = new MultiGraph();
    g.addNode("A");
    g.addNode("B");
    // g.addNode("C");

    g.addEdge("A", "B", { dir: "up", field: "up" });
    // g.addEdge("C", "A", { dir: "prev", field: "prev" });

    const closed = getReflexiveClosure(g, userHiers);

    const gStr = closed.inspect();
    this.verifyAsJSON(gStr, {
      reporters: ["tortoisemerge"],
      appendEOL: true,
      normalizeLineEndingsTo: "\r\n",
    });
  });
});

export {};