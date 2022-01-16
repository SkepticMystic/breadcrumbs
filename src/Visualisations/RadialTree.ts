import * as d3 from "d3";
import type Graph from "graphology";
import type { App, TFile } from "obsidian";
import { dfsFlatAdjList, VisModal } from "./VisModal";

export const radialTree = (
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

  const svg = d3
    .select(".d3-graph")
    .append("svg")
    .attr("height", height)
    .attr("width", width);

  const root = d3
    .hierarchy(hierarchy, (d) => d.children)
    .sum((d) => (d.children ? 0 : 1))
    .sort((a, b) => a.depth - b.depth);

  const outerRadius = width / 2;
  const innerRadius = outerRadius - 170;

  const cluster = d3
    .cluster()
    .size([360, innerRadius])
    .separation((a, b) => 1);

  const color = d3
    .scaleOrdinal()
    .domain(graph.nodes())
    .range(d3.schemeCategory10);

  function maxLength(d: d3.HierarchyNode<unknown>) {
    return d.data.data.depth + (d.children ? d3.max(d.children, maxLength) : 0);
  }

  function setRadius(d: d3.HierarchyNode<unknown>, y0: number, k: number) {
    d.radius = (y0 += d.data.data.depth) * k;
    if (d.children) d.children.forEach((d) => setRadius(d, y0, k));
  }

  function setColor(d: d3.HierarchyNode<unknown>) {
    var name = d.data.data.name;
    d.color =
      color.domain().indexOf(name) >= 0
        ? color(name)
        : d.parent
        ? d.parent.color
        : null;
    if (d.children) d.children.forEach(setColor);
  }

  function linkVariable(d) {
    return linkStep(d.source.x, d.source.radius, d.target.x, d.target.radius);
  }

  function linkConstant(d) {
    return linkStep(d.source.x, d.source.y, d.target.x, d.target.y);
  }

  function linkExtensionVariable(d) {
    return linkStep(d.target.x, d.target.radius, d.target.x, innerRadius);
  }

  function linkExtensionConstant(d) {
    return linkStep(d.target.x, d.target.y, d.target.x, innerRadius);
  }

  function linkStep(
    startAngle: number,
    startRadius: number,
    endAngle: number,
    endRadius: number
  ) {
    const c0 = Math.cos((startAngle = ((startAngle - 90) / 180) * Math.PI));
    const s0 = Math.sin(startAngle);
    const c1 = Math.cos((endAngle = ((endAngle - 90) / 180) * Math.PI));
    const s1 = Math.sin(endAngle);
    return (
      "M" +
      startRadius * c0 +
      "," +
      startRadius * s0 +
      (endAngle === startAngle
        ? ""
        : "A" +
          startRadius +
          "," +
          startRadius +
          " 0 0 " +
          (endAngle > startAngle ? 1 : 0) +
          " " +
          startRadius * c1 +
          "," +
          startRadius * s1) +
      "L" +
      endRadius * c1 +
      "," +
      endRadius * s1
    );
  }

  const legend = (svg) => {
    const g = svg
      .selectAll("g")
      .data(color.domain())
      .join("g")
      .attr(
        "transform",
        (d, i) => `translate(${-outerRadius},${-outerRadius + i * 20})`
      );

    g.append("rect").attr("width", 18).attr("height", 18).attr("fill", color);

    g.append("text")
      .attr("x", 24)
      .attr("y", 9)
      .attr("dy", "0.35em")
      .text((d) => d);
  };

  cluster(root);
  setRadius(root, (root.data.data.depth = 0), innerRadius / maxLength(root));
  setColor(root);

  svg.append("g").call(legend);

  svg.append("style").text(`

.link--active {
stroke: #000 !important;
stroke-width: 1.5px;
}

.link-extension--active {
stroke-opacity: .6;
}

.label--active {
font-weight: bold;
}

`);

  const linkExtension = svg
    .append("g")
    .attr("fill", "none")
    .attr("stroke", "#000")
    .attr("stroke-opacity", 0.25)
    .selectAll("path")
    .data(root.links().filter((d) => !d.target.children))
    .join("path")
    .each(function (d) {
      d.target.linkExtensionNode = this;
    })
    .attr("d", linkExtensionConstant);

  const link = svg
    .append("g")
    .attr("fill", "none")
    .attr("stroke", "#000")
    .selectAll("path")
    .data(root.links())
    .join("path")
    .each(function (d) {
      d.target.linkNode = this;
    })
    .attr("d", linkConstant)
    .attr("stroke", (d) => d.target.color);

  const label = svg
    .append("g")
    .selectAll("text")
    .data(root.leaves())
    .join("text")
    .attr("dy", ".31em")
    .attr(
      "transform",
      (d) =>
        `rotate(${d.x - 90}) translate(${innerRadius + 4},0)${
          d.x < 180 ? "" : " rotate(180)"
        }`
    )
    .attr("text-anchor", (d) => (d.x < 180 ? "start" : "end"))
    .text((d) => d.data.data.name)
    .on("mouseover", mouseovered(true))
    .on("mouseout", mouseovered(false));

  //   function update(checked) {
  //     const t = d3.transition().duration(750);
  //     linkExtension
  //       .transition(t)
  //       .attr("d", checked ? linkExtensionVariable : linkExtensionConstant);
  //     link.transition(t).attr("d", checked ? linkVariable : linkConstant);
  //   }

  function mouseovered(active) {
    return function (event, d) {
      d3.select(this).classed("label--active", active);
      d3.select(d.linkExtensionNode)
        .classed("link-extension--active", active)
        .raise();
      do d3.select(d.linkNode).classed("link--active", active).raise();
      while ((d = d.parent));
    };
  }

  function zoomed({ transform }) {
    linkExtension.attr("transform", transform);
    link.attr("transform", transform);
    label.attr("transform", transform);
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
