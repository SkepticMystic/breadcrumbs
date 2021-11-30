import { MultiGraph } from "graphology";
import { dfsAllPaths } from "../src/graphUtils";
import { testGraph } from "./testUtils";

require("approvals").mocha();

describe("Traversals", function () {
  it("dfsAllPaths1", function () {
    const g = new MultiGraph();
    g.addNode("A");
    g.addNode("B");
    // g.addNode("C");

    g.addEdge("A", "B", { dir: "up", field: "up" });
    // g.addEdge("C", "A", { dir: "prev", field: "prev" });

    const paths = dfsAllPaths(g, "A");

    this.verifyAsJSON(paths, {
      reporters: ["tortoisemerge"],
      appendEOL: true,
      normalizeLineEndingsTo: "\r\n",
    });
  });

  it("dfsAllPaths2", function () {
    const g = testGraph();
    const paths = dfsAllPaths(g, "a");

    this.verifyAsJSON(paths, {
      reporters: ["tortoisemerge"],
      appendEOL: true,
      normalizeLineEndingsTo: "\r\n",
    });
  });
});

export {};
