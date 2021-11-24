import * as d3 from "d3";
import type Graph from "graphology";
import type { App, TFile } from "obsidian";
import { openOrSwitch } from "obsidian-community-lib";
import { dfsFlatAdjList, VisModal } from "../VisModal";

export const tidyTree = (
  graph: Graph,
  app: App,
  currFile: TFile,
  modal: VisModal,
  width: number,
  height: number
) => {
  // const adjList: AdjListItem[] = bfsAdjList(graph, currFile.basename);
  // console.log({ adjList });

  // const noDoubles = [...adjList];
  // noDoubles.forEach((a, i, list) => {
  //   if (list.some((b, j) => i !== j && a.parentId === b.parentId)) {
  //     noDoubles.splice(i, 1);
  //   }
  // });
  // console.log({ noDoubles });

  const tree = (data) => {
    const root = d3.hierarchy(data);
    root.dx = 10;
    root.dy = width / (root.height + 1);
    return d3.tree().nodeSize([root.dx, root.dy])(root);
  };

  const flatAdj = dfsFlatAdjList(graph, currFile.basename);
  console.log({ flatAdj });

  const hierarchy = d3.stratify()(flatAdj);
  console.log({ hierarchy });

  const root = tree(hierarchy);
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
    return d.data.data.name;
  });

  const nodeClick = (event: MouseEvent, dest: string) => {
    openOrSwitch(app, dest, event);
    modal.close();
  };
  node.on("click", (event: MouseEvent, d) => {
    console.log({ d });
    nodeClick(event, d.data.data.name);
  });

  node
    .append("text")
    .attr("dy", "0.31em")
    .attr("x", (d) => (d.children ? -6 : 6))
    .attr("text-anchor", (d) => (d.children ? "end" : "start"))
    .text((d) => d.data.data.name)
    .clone(true)
    .lower()
    .attr("stroke", "white");

  function zoomed({ transform }) {
    svg.attr("transform", transform);
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
};
