import { MultiGraph } from "graphology";
import { getReflexiveClosure } from "../src/Utils/graphUtils";
import { testHiers, verify } from "./testUtils";

require("approvals").mocha();

describe("getReflexiveClosure", function () {
  it("1", async function () {
    const userHiers = testHiers();

    const g = new MultiGraph();
    g.addNode("A");
    g.addNode("B");

    g.addEdge("A", "B", { dir: "up", field: "up" });

    const closed = getReflexiveClosure(g, userHiers);

    const gStr = closed.inspect();

    verify.call(this, gStr);
  });
});

export {};
