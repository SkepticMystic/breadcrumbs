import * as d3 from "d3";
import type { Graph } from "graphlib";
import type { App, TFile } from "obsidian";
import { format } from "path";
import { openOrSwitch } from "src/sharedFunctions";
import type { VisModal } from "src/VisModal";
import { dfsFlatAdjList } from "src/VisModal";

export const treeMap = (
  graph: Graph,
  app: App,
  currFile: TFile,
  modal: VisModal,
  width: number,
  height: number
) => {
  const flatAdj = dfsFlatAdjList(graph, currFile.basename);
  console.log({ flatAdj });

  const hierarchy = d3.stratify()(flatAdj);
  console.log({ hierarchy });

  const root = d3
    .treemap()
    .tile(d3.treemapBinary)
    .size([width, height])
    .padding(1)
    .round(true)(
    hierarchy.sum((d) => d.height).sort((a, b) => b.height - a.height)
  );

  //   const root = treemap(data);

  const svg = d3
    .select(".d3-graph")
    .append("svg")
    .attr("height", height)
    .attr("width", width)
    .style("font", "10px sans-serif");

  const leaf = svg
    .selectAll("g")
    .data(root.leaves())
    .join("g")
    .attr("transform", (d) => `translate(${d.x0},${d.y0})`);

  leaf.attr("aria-label", (d) => d.data.name);

  //   leaf.append("title").text(
  //     (d) =>
  //       `${d
  //         .ancestors()
  //         .reverse()
  //         .map((d) => d.data.id)
  //         .join("/")}\n${format(d.height)}`
  //   );

  const color = d3.scaleOrdinal(d3.schemeCategory10);

  leaf
    .append("rect")
    // .attr("id", (d) => (d.leafUid = DOM.uid("leaf")).id)
    .attr("fill", (d) => {
      while (d.depth > 1) d = d.parent;
      return color(d.data.id);
    })
    .attr("fill-opacity", 0.6)
    .attr("width", (d) => d.x1 - d.x0)
    .attr("height", (d) => d.y1 - d.y0);

  leaf
    .append("clipPath")
    // .attr("id", (d) => (d.clipUid = DOM.uid("clip")).id)
    .append("use");
  // .attr("xlink:href", (d) => d.leafUid.href);

  //   leaf
  //     .append("text")
  //     .attr("clip-path", (d) => d.clipUid)
  //     .selectAll("tspan")
  //     .data((d) => {
  //       console.log({ d });
  //       return d.data.name.split(/(?=[A-Z][^A-Z])/g).concat(format(d.height));
  //     })
  //     .join("tspan")
  //     .attr("x", 3)
  //     .attr(
  //       "y",
  //       (d, i, nodes) => `${(i === nodes.length - 1) * 0.3 + 1.1 + i * 0.9}em`
  //     )
  //     .attr("fill-opacity", (d, i, nodes) =>
  //       i === nodes.length - 1 ? 0.7 : null
  //     );
  //   // .text((d) => d);

  const nodeClick = (event: MouseEvent, dest: string) => {
    openOrSwitch(app, dest, currFile, event);
    modal.close();
  };
  leaf.on("click", (event: MouseEvent, d) => {
    console.log({ d });
    nodeClick(event, d.data.name);
  });

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
