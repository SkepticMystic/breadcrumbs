import * as d3 from "d3";
import type Graph from "graphology";
import type { App, TFile } from "obsidian";
import type { d3Node } from "../interfaces";
import { graphlibToD3, VisModal } from "../VisModal";
import { openOrSwitch } from "obsidian-community-lib";

export const arcDiagram = (
  graph: Graph,
  app: App,
  currFile: TFile,
  modal: VisModal,
  width: number,
  height: number
) => {
  const data = graphlibToD3(graph);

  const margin = { top: 20, right: 20, bottom: 20, left: 150 };
  const svg = d3
    .select(".d3-graph")
    .append("svg")
    .attr("height", height)
    .attr("width", width);

  const nodes = data.nodes.map(({ id, name }) => ({
    id,
    name,
    sourceLinks: [],
    targetLinks: [],
  }));

  const nodeById = new Map(nodes.map((d) => [d.id, d]));

  const links = data.links.map(({ source, target }) => ({
    source: nodeById.get(source as number),
    target: nodeById.get(target as number),
  }));

  for (const link of links) {
    const { source, target } = link;
    source.sourceLinks.push(link);
    target.targetLinks.push(link);
  }

  svg.append("style").text(`

path {
  stroke: #808080;
  opacity: 0.8;
}

text {
  stroke: var(--text-a);
  opacity: 0.8;
}


.hover g.primary text {
  fill: black;
}

.hover g.secondary text {
  fill: #333;
}

.hover .secondary {
    color: red;
}

.hover path.primary {
  stroke: #333;
  stroke-opacity: 1;
}

.hover rect {
    opacity: 1;
    cursor: pointer;
}

`);

  const y = d3.scalePoint(nodes.map((d) => d.name).sort(d3.ascending), [
    margin.top,
    height - margin.bottom,
  ]);

  const label = svg
    .append("g")
    .attr("font-family", "sans-serif")
    .attr("font-size", 10)
    .attr("text-anchor", "end")
    .selectAll("g")
    .data(nodes)
    .join("g")
    .attr("transform", (d) => `translate(${margin.left},${(d.y = y(d.name))})`)
    .call((g) =>
      g
        .append("text")
        .attr("x", -6)
        .attr("dy", "0.35em")
        // .attr("fill", (d) => d3.lab(color(d.group)).darker(2))
        .text((d) => d.name)
    )
    .call(
      (g) => g.append("circle").attr("r", 3)
      // .attr("fill", (d) => color(d.group))
    );

  const path = svg
    .insert("g", "*")
    .attr("fill", "none")
    .attr("stroke-opacity", 0.6)
    .attr("stroke-width", 1.5)
    .selectAll("path")
    .data(links)
    .join("path")
    // .attr("stroke", (d) =>
    //   d.source.group === d.target.group ? color(d.source.group) : "#aaa"
    // )
    .attr("d", arc);

  const step = 104;

  const nodeClick = (event: MouseEvent, dest: string) => {
    openOrSwitch(app, dest, event);
    modal.close();
  };

  const overlay = svg
    .append("g")
    .attr("fill", "none")
    .attr("pointer-events", "all")
    .selectAll("rect")
    .data(nodes)
    .join("rect")
    .attr("width", margin.left + 40)
    .attr("height", step)
    .attr("y", (d) => y(d.name) - step / 2)
    .on("mouseover", (d) => {
      svg.classed("hover", true);
      label.classed("primary", (n) => n === d);
      label.classed(
        "secondary",
        (n) =>
          n.sourceLinks.some((l) => l.target === d) ||
          n.targetLinks.some((l) => l.source === d)
      );
      path
        .classed("primary", (l) => l.source === d || l.target === d)
        .filter(".primary")
        .raise();
    })
    .on("mouseout", (d) => {
      svg.classed("hover", false);
      label.classed("primary", false);
      label.classed("secondary", false);
      path.classed("primary", false).order();
    })
    .on("click", (event: MouseEvent, d: d3Node) => {
      nodeClick(event, d.name);
    });

  //   function update() {
  //     y.domain(nodes.sort(viewof order.value).map(d => d.id));

  //     const t = svg.transition()
  //         .duration(750);

  //     label.transition(t)
  //         .delay((d, i) => i * 20)
  //         .attrTween("transform", d => {
  //           const i = d3.interpolateNumber(d.y, y(d.id));
  //           return t => `translate(${margin.left},${d.y = i(t)})`;
  //         });

  //     path.transition(t)
  //         .duration(750 + nodes.length * 20)
  //         .attrTween("d", d => () => arc(d));

  //     overlay.transition(t)
  //         .delay((d, i) => i * 20)
  //         .attr("y", d => y(d.id) - step / 2);
  //   }

  //   viewof order.addEventListener("input", update);
  //   invalidation.then(() => viewof order.removeEventListener("input", update));

  function arc(d: { source: { y: number }; target: { y: number } }) {
    const y1 = d.source.y;
    const y2 = d.target.y;
    const r = Math.abs(y2 - y1) / 2;
    return `M${margin.left},${y1}A${r},${r} 0,0,${y1 < y2 ? 1 : 0} ${
      margin.left
    },${y2}`;
  }

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
