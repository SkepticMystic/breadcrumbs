import * as d3 from "d3";
import type { Graph } from "graphlib";
import { createTreeHierarchy } from "hierarchy-js";
import type { App, TFile } from "obsidian";
import type { AdjListItem, d3Node, d3Tree } from "src/interfaces";
import { openOrSwitch } from "src/sharedFunctions";
import {
  bfsAdjList,
  bfsFromAllSinks,
  reverseDepth,
  stratify,
  VisModal,
} from "src/VisModal";

export const circlePacking = (
  graph: Graph,
  app: App,
  currFile: TFile,
  modal: VisModal,
  width: number,
  height: number
) => {
  const adjList: AdjListItem[] = bfsAdjList(graph, currFile.basename);
  console.log({ adjList });

  const root = stratify(adjList);
  console.log(root);

  console.log(reverseDepth(adjList));

  const noDoubles = adjList.filter(
    (thing, index, self) =>
      index ===
      self.findIndex(
        //   This version only check if the name is the same, not the parent
        (t) => t.name === thing.name
      )
  );
  console.log({ noDoubles });

  const hierarchy: d3Tree = createTreeHierarchy(noDoubles, {
    id: "name",
    excludeParent: true,
  });

  console.log({ hierarchy });

  const svg = d3
    .select(".d3-graph")
    .append("svg")
    .attr("height", height)
    .attr("width", width);

  // Initialize the circle: all located at the center of the svg area
  const node = svg
    .append("g")
    .selectAll("circle")
    .data(noDoubles)
    .join("circle")
    .attr("r", 25)
    .attr("cx", width / 2)
    .attr("cy", height / 2)
    .style("fill", "#69b3a2")
    .style("fill-opacity", 0.3)
    .attr("stroke", "#69a2b2")
    .style("stroke-width", 4);

  node.attr("aria-label", (d: AdjListItem) => d.name);

  const nodeClick = (event: MouseEvent, dest: string) => {
    const currFile = app.workspace.getActiveFile();
    openOrSwitch(app, dest, currFile, event);
    modal.close();
  };
  node.on("click", (event: MouseEvent, d: d3Node) => {
    nodeClick(event, d.name);
  });

  // Features of the forces applied to the nodes:
  const simulation = d3
    .forceSimulation()
    .force(
      "center",
      d3
        .forceCenter()
        .x(width / 2)
        .y(height / 2)
    ) // Attraction to the center of the svg area
    .force("charge", d3.forceManyBody().strength(0.5)) // Nodes are attracted one each other of value is > 0
    .force(
      "collide",
      d3.forceCollide().strength(0.01).radius(30).iterations(1)
    ); // Force that avoids circle overlapping

  // Apply these forces to the nodes and update their positions.
  // Once the force algorithm is happy with positions ('alpha' value is low enough), simulations will stop.
  simulation.nodes(noDoubles).on("tick", function (d) {
    node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
  });
};
