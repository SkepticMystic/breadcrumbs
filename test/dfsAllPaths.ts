import { MultiGraph } from "graphology";
import { dfsAllPaths } from "../src/graphUtils";
import { testGraph, verify } from "./testUtils";

require("approvals").mocha();

describe("dfsAllPaths", function () {
  it("1", function () {
    const g = new MultiGraph();
    g.addNode("A");
    g.addNode("B");

    g.addEdge("A", "B", { dir: "up", field: "up" });

    const paths = dfsAllPaths(g, "A");

    verify.call(this, paths);
  });

  it("2", function () {
    const g = testGraph();
    const paths = dfsAllPaths(g, "a");

    verify.call(this, paths);
  });
});

export {};
