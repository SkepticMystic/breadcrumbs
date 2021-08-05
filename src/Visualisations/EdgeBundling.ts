import type { HierarchyPointNode } from "d3";
import * as d3 from "d3";
import type { Graph } from "graphlib";
import { createTreeHierarchy } from "hierarchy-js";
import type { TFile } from "obsidian";
import type { AdjListItem, d3Node, d3Tree } from "src/interfaces";
import { dfsAdjList } from "src/VisModal";

export const edgeBundling = (
  graph: Graph,
  contentEl: HTMLElement,
  currFile: TFile,
  width: number,
  height: number
) => {
  const adjList: AdjListItem[] = dfsAdjList(graph, currFile.basename);
  console.log({ adjList });

  const noDoubles = adjList.filter(
    (thing, index, self) =>
      index ===
      self.findIndex(
        (t) => t.name === thing.name && t?.parentId === thing?.parentId
      )
  );
  console.log({ noDoubles });

  const hierarchy: d3Tree = createTreeHierarchy(noDoubles, {
    id: "name",
    excludeParent: true,
  });

  console.log({ hierarchy });

  const radius = 477;
  const colornone = "#ccc";
  const colorout = "#f00";
  const colorin = "#00f";

  const line = d3
    .lineRadial()
    .curve(d3.curveBundle.beta(0.85))
    .radius((d) => d[0])
    .angle((d) => d[1]);

  const clus = d3.cluster().size([2 * Math.PI, radius - 100]);

  const svg = d3
    .select(".d3-graph")
    .append("svg")
    .attr("height", height)
    .attr("width", width);

  const root = clus(
    bilink(
      d3
        .hierarchy(hierarchy)
        .sort(
          (a, b) =>
            d3.ascending(a.height, b.height) ||
            d3.ascending(a.data.name, b.data.name)
        )
    )
  );

  console.log({ root });

  function id(node: HierarchyPointNode<unknown>) {
    return `${node.parent ? id(node.parent) + "." : ""}${node.data.name}`;
  }

  const node = svg
    .append("g")
    .attr("font-family", "sans-serif")
    .attr("font-size", 10)
    .selectAll("g")
    .data(root.leaves())
    .join("g")
    .attr(
      "transform",
      (d) => `rotate(${(d.x * 180) / Math.PI - 90}) translate(${d.y},0)`
    )
    .append("text")
    .attr("dy", "0.31em")
    .attr("x", (d) => (d.x < Math.PI ? 6 : -6))
    .attr("text-anchor", (d) => (d.x < Math.PI ? "start" : "end"))
    .attr("transform", (d) => (d.x >= Math.PI ? "rotate(180)" : null));
  //     .text((d) => d.data.name)
  //     .each(function (d) {
  //       d.text = this;
  //     })
  //     .on("mouseover", overed)
  //     .on("mouseout", outed)
  //     .call((text) =>
  //       text.append("title").text(
  //         (d) => `${id(d)}
  // ${d.outgoing.length} outgoing
  // ${d.incoming.length} incoming`
  //       )
  //     );

  const link = svg.append("g").attr("stroke", colornone).attr("fill", "none");
  // .selectAll("path")
  // .data(root.leaves().flatMap((leaf) => leaf.outgoing))
  // .join("path")
  // .style("mix-blend-mode", "multiply")
  // .attr("d", ([i, o]) => line(i.path(o)))
  // .each(function (d) {
  //   d.path = this;
  // });

  function bilink(root) {
    const map = new Map(root.leaves().map((d) => [id(d), d]));
    for (const d of root.leaves())
      (d.incoming = []),
        (d.outgoing = d.data.imports.map((i) => [d, map.get(i)]));
    for (const d of root.leaves())
      for (const o of d.outgoing) o[1].incoming.push(o);
    return root;
  }

  function overed(event, d) {
    link.style("mix-blend-mode", null);
    d3.select(this).attr("font-weight", "bold");
    d3.selectAll(d.incoming.map((d) => d.path))
      .attr("stroke", colorin)
      .raise();
    d3.selectAll(d.incoming.map(([d]) => d.text))
      .attr("fill", colorin)
      .attr("font-weight", "bold");
    d3.selectAll(d.outgoing.map((d) => d.path))
      .attr("stroke", colorout)
      .raise();
    d3.selectAll(d.outgoing.map(([, d]) => d.text))
      .attr("fill", colorout)
      .attr("font-weight", "bold");
  }

  function outed(event, d) {
    link.style("mix-blend-mode", "multiply");
    d3.select(this).attr("font-weight", null);
    d3.selectAll(d.incoming.map((d) => d.path)).attr("stroke", null);
    d3.selectAll(d.incoming.map(([d]) => d.text))
      .attr("fill", null)
      .attr("font-weight", null);
    d3.selectAll(d.outgoing.map((d) => d.path)).attr("stroke", null);
    d3.selectAll(d.outgoing.map(([, d]) => d.text))
      .attr("fill", null)
      .attr("font-weight", null);
  }
};
