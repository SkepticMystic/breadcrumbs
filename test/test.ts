import { MultiGraph } from "graphology";
import { getReflexiveClosure } from "../src/graphUtils";

require("approvals").mocha();

describe("Graph Functions", function () {
  it("getReflexiveClosure", async function () {
    const userHiers = [
      {
        down: ["down"],
        next: [],
        prev: [],
        same: [],
        up: ["up", "parent"],
      },
    ];

    const g = new MultiGraph();
    g.addNode("A");
    g.addNode("B");

    g.addEdge("A", "B", { dir: "up", field: "up" });

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
