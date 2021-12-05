import { MultiGraph } from "graphology";
import type { UserHier } from "../src/interfaces";

export function testGraph() {
  const g = new MultiGraph();

  ["a", "b", "c", "d", "e", "f"].forEach((n) => g.addNode(n));
  g.addEdge("a", "b", { dir: "up", field: "up" });
  g.addEdge("a", "c", { dir: "up", field: "up" });
  g.addEdge("b", "c", { dir: "up", field: "up" });
  g.addEdge("b", "d", { dir: "up", field: "up" });
  g.addEdge("c", "d", { dir: "up", field: "up" });
  g.addEdge("d", "e", { dir: "up", field: "up" });
  g.addEdge("d", "f", { dir: "up", field: "up" });
  g.addEdge("e", "f", { dir: "up", field: "up" });

  return g;
}

export function testHiers(): UserHier[] {
  return [
    {
      down: ["down"],
      next: ["next"],
      prev: ["prev"],
      same: ["same"],
      up: ["up"],
    },
  ];
}

export function verify(sol: any) {
  this.verifyAsJSON(sol, {
    reporters: ["tortoisemerge"],
    appendEOL: true,
    normalizeLineEndingsTo: "\r\n",
  });
}
