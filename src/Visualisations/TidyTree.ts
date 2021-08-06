import * as d3 from "d3";
import type { Graph } from "graphlib";
import type { App, TFile } from "obsidian";
import { bfsAdjList, stratify, VisModal } from "src/VisModal";
import type { AdjListItem, d3Node } from "src/interfaces";
import { openOrSwitch } from "src/sharedFunctions";

export const tidyTree = (
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
  noDoubles.forEach((a, i, list) => {
    if (list.some((b, j) => i !== j && a.parentId === b.parentId)) {
      noDoubles.splice(i, 1);
    }
  });
  console.log({ noDoubles });

  const tree = (data) => {
    const root = d3.hierarchy(data);
    root.dx = 10;
    root.dy = width / (root.height + 1);
    return d3.tree().nodeSize([root.dx, root.dy])(root);
  };

  const root = tree(stratify(noDoubles));
  console.log(root);

  let x0 = Infinity;
  let x1 = -x0;
  root.each((d) => {
    if (d.x > x1) x1 = d.x;
    if (d.x < x0) x0 = d.x;
  });

  const svg = d3
    .select(".d3-graph")
    .append("svg")
    .attr("height", height)
    .attr("width", width);

  const g = svg
    .append("g")
    .attr("font-family", "sans-serif")
    .attr("font-size", 10)
    .attr("transform", `translate(${root.dy / 3},${root.dx - x0})`);

  const link = g
    .append("g")
    .attr("fill", "none")
    .attr("stroke", "#555")
    .attr("stroke-opacity", 0.4)
    .attr("stroke-width", 1.5)
    .selectAll("path")
    .data(root.links())
    .join("path")
    .attr(
      "d",
      d3
        .linkHorizontal()
        .x((d) => d.y)
        .y((d) => d.x)
    );

  const node = g
    .append("g")
    .attr("stroke-linejoin", "round")
    .attr("stroke-width", 10)
    .selectAll("g")
    .data(root.descendants())
    .join("g")
    .attr("transform", (d) => `translate(${d.y},${d.x})`);

  node
    .append("circle")
    .attr("fill", (d) => (d.children ? "#555" : "#999"))
    .attr("r", 10);

  node.attr("aria-label", (d) => {
    console.log(d);
    return d.data.id;
  });

  const nodeClick = (event: MouseEvent, dest: string) => {
    openOrSwitch(app, dest, currFile, event);
    modal.close();
  };
  node.on("click", (event: MouseEvent, d: d3Node) => {
    nodeClick(event, d.name);
  });

  // node
  //   .append("text")
  //   .attr("dy", "0.31em")
  //   .attr("x", (d) => (d.children ? -6 : 6))
  //   .attr("text-anchor", (d) => (d.children ? "end" : "start"))
  //   .text((d) => d.data.id)
  //   .clone(true)
  //   .lower()
  //   .attr("stroke", "white");
};
