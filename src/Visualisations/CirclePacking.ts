import * as d3 from "d3";
import type { Graph } from "graphlib";
import type { App, TFile } from "obsidian";
import type { AdjListItem, d3Node } from "src/interfaces";
import { openOrSwitch } from "src/sharedFunctions";
import { bfsAdjList, VisModal } from "src/VisModal";

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

  const noDoubles = [...adjList];
  noDoubles.forEach((a, i) => {
    if (noDoubles.some((b, j) => i !== j && a.name === b.name)) {
      const index = noDoubles.findIndex((b, j) => i !== j && a.name === b.name);
      noDoubles.splice(index, 1);
    }
  });

  // const noDoubles = adjList.filter((a) => {
  //   !adjList.some((b) => {
  //     console.log({ a, b });
  //     return a.name !== b.name && a.parentId === b.parentId;
  //   });
  // });
  console.log({ noDoubles });

  // const root = stratify(noDoubles);
  // console.log(root);

  // const hierarchy: d3Tree = createTreeHierarchy(noDoubles, {
  //   id: "name",
  //   excludeParent: true,
  // });

  // console.log({ hierarchy });

  const svg = d3
    .select(".d3-graph")
    .append("svg")
    .attr("height", height)
    .attr("width", width);

  const nodeColour = getComputedStyle(document.body).getPropertyValue(
    "--text-accent"
  );

  // Initialize the circle: all located at the center of the svg area
  const node = svg
    .append("g")
    .selectAll("circle")
    .data(noDoubles)
    .join("circle")
    .attr("r", (d) => Math.round(d.height / 10) + 10)
    .attr("cx", width / 2)
    .attr("cy", height / 2)
    .style("fill", nodeColour)
    .style("fill-opacity", 0.6)
    .attr("stroke", nodeColour)
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
      d3.forceCollide().strength(0.025).radius(30).iterations(1)
    ); // Force that avoids circle overlapping

  // Apply these forces to the nodes and update their positions.
  // Once the force algorithm is happy with positions ('alpha' value is low enough), simulations will stop.
  simulation.nodes(noDoubles).on("tick", function (d) {
    node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
  });

  function zoomed({ transform }) {
    node.attr("transform", transform);
  }
  svg.call(
    d3
      .zoom()
      .extent([
        [0, 0],
        [width, height],
      ])
      .scaleExtent([0.5, 8])
      .on("zoom", zoomed)
  );

  const drag = (
    simulation: d3.Simulation<d3.SimulationNodeDatum, undefined>
  ) => {
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return d3
      .drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  };

  node.call(drag(simulation));
};
