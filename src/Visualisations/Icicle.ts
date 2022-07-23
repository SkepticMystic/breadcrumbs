import * as d3 from "d3";
import type Graph from "graphology";
import type { TFile } from "obsidian";
import { dfsFlatAdjList, VisModal } from "./VisModal";

export const icicle = (
  graph: Graph,
  currFile: TFile,
  modal: VisModal,
  width: number,
  viewHeight: number
) => {
  const flatAdj = dfsFlatAdjList(graph, currFile.basename);
  console.log({ flatAdj });

  const hier = d3.stratify()(flatAdj);
  console.log({ hier });

  const format = d3.format(",d");

  const color = d3.scaleOrdinal(
    d3.quantize(d3.interpolateRainbow, hier.children.length + 1)
  );

  const partition = (data) => {
    const root = d3
      .hierarchy(data)
      .sum((d) => d.value)
      .sort((a, b) => b.height - a.height || b.value - a.value);
    return d3.partition().size([viewHeight, ((root.height + 1) * width) / 3])(
      root
    );
  };

  const root = partition(hier);
  let focus = root;

  const svg = d3
    .select(".d3-graph")
    .append("svg")
    .attr("height", viewHeight)
    .attr("width", width)
    .style("font", "10px sans-serif");

  const cell = svg
    .selectAll("g")
    .data(root.descendants())
    .join("g")
    .attr("transform", (d) => `translate(${d.y0},${d.x0})`);

  const rect = cell
    .append("rect")
    .attr("width", (d) => d.y1 - d.y0 - 1)
    .attr("height", (d) => rectHeight(d))
    .attr("fill-opacity", 0.6)
    .attr("fill", (d) => {
      if (!d.depth) return "#ccc";
      while (d.depth > 1) d = d.parent;
      return color(d.data.data.name);
    })
    .style("cursor", "pointer")
    .on("click", clicked);

  const text = cell
    .append("text")
    .style("user-select", "none")
    .attr("pointer-events", "none")
    .attr("x", 4)
    .attr("y", 13);
  // .attr("fill-opacity", (d) => +labelVisible(d));

  text.append("tspan").text((d) => d.data.data.name);

  const tspan = text
    .append("tspan")
    .attr("fill-opacity", (d) => (labelVisible(d) ? 1 : 0) * 0.7)
    .text((d) => ` ${format(d.value)}`);

  cell.append("title").text(
    (d) =>
      `${d.ancestors().map((d) => d.data.data.name)
      // .reverse()
      // .join("/")}\n${format(d.value)
      }`
  );

  function clicked(event, p) {
    console.log({ p });
    focus = focus === p ? (p = p.parent) : p;

    root.each((d) => {
      d.target = {
        x0: ((d.x0 - p.x0) / (p.x1 - p.x0)) * viewHeight,
        x1: ((d.x1 - p.x0) / (p.x1 - p.x0)) * viewHeight,
        y0: d.y0 - p.y0,
        y1: d.y1 - p.y0,
      };
      console.log(d.target.x0);
    });

    const t = cell
      .transition()
      .duration(750)
      .attr("transform", (d) => `translate(${d.target.y0},${d.target.x0})`);

    rect.transition(t).attr("height", (d) => rectHeight(d.target));
    text.transition(t).attr("fill-opacity", (d) => +labelVisible(d.target));
    tspan
      .transition(t)
      .attr("fill-opacity", (d) => (labelVisible(d) ? 1 : 0) * 0.7);
  }

  function rectHeight(d) {
    console.log({ d });
    return d.x1 - d.x0 - Math.min(1, (d.x1 - d.x0) / 2);
  }

  function labelVisible(d) {
    return d.y1 <= width && d.y0 >= 0 && d.x1 - d.x0 > 16;
  }
};
