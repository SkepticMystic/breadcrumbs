import * as d3 from "d3";
import type { Graph } from "graphlib";
import { openOrSwitch } from "src/sharedFunctions";
import type { d3Node } from "src/interfaces";
import { graphlibToD3, VisModal } from "src/VisModal";
import type { App, TFile } from "obsidian";

export const forceDirectedG = (
  graph: Graph,
  app: App,
  currFile: TFile,
  modal: VisModal,
  width: number,
  height: number
) => {
  const colourChange = d3
    .select(".d3-graph")
    .append("input")
    .attr("height", 100)
    .attr("width", 100)
    .attr("type", "color");

  colourChange.on("change", function changeColor(el) {
    const colour = el.target.value
    node
      .transition()
      .duration(500)
      .style("fill", colour)
      .attr("stroke", colour);
  });

  const data = graphlibToD3(graph);

  const links: {
    index: number;
    source: { index: number };
    target: { index: number };
  }[] = data.links.map((d) => Object.create(d));

  const nodes = data.nodes.map((d) => Object.create(d));

  const simulation = d3
    .forceSimulation(nodes)
    .force(
      "link",
      d3.forceLink(links).id((d) => d.id)
    )
    .force("charge", d3.forceManyBody())
    .force("center", d3.forceCenter(width / 2, height / 2).strength(0.5));

  const drag = (simulation: d3.Simulation<any, undefined>) => {
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

  const svg = d3
    .select(".d3-graph")
    .append("svg")
    .attr("height", height)
    .attr("width", width)
    .attr("class", "forceDirectedG");

  const link = svg
    .append("g")
    .attr("stroke", "#868282")
    .attr("stroke-opacity", 0.6)
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("stroke-width", 0.8)
    .attr("marker-end", "url(#end)");

  var path = svg
    .append("svg:g")
    .selectAll("path")
    .data(links)
    .enter()
    .append("svg:path")
    //    .attr("class", function(d) { return "link " + d.type; })
    .attr("class", "link")
    .attr("marker-end", "url(#end)");

  const arrowHead = svg
    .append("svg:defs")
    .selectAll("marker")
    .data(["end"]) // Different link/path types can be defined here
    .enter()
    .append("svg:marker") // This section adds in the arrows
    .attr("id", String)
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 20)
    .attr("refY", 0.1)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    // .attr("stroke", "#868282")
    .attr("stroke-width", 10)
    .append("svg:path")
    .attr("d", "M0,-5L10,0L0,5");

  const nodeColour = getComputedStyle(document.body).getPropertyValue(
    "--text-accent"
  );

  const node: d3.Selection<
    d3.BaseType | SVGCircleElement,
    any,
    SVGGElement,
    unknown
  > = svg
    .append("g")
    .attr("stroke", nodeColour)
    .attr("stroke-width", 1.5)
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("r", 5)
    .attr("fill", nodeColour)
    .call(drag(simulation));

  node.attr("aria-label", (d: d3Node) => d.name);

  const nodeClick = (event: MouseEvent, dest: string) => {
    const currFile = app.workspace.getActiveFile();
    openOrSwitch(app, dest, currFile, event);
    modal.close();
  };
  node.on("click", (event: MouseEvent, d: d3Node) => {
    nodeClick(event, d.name);
  });

  function linked(a: number, b: number) {
    if (a === b) return true;
    const linkedArr = links.find(
      (link) =>
        (link.source.index === a && link.target.index === b) ||
        (link.target.index === a && link.source.index === b)
    );

    return !!linkedArr;
  }

  node
    .on("mouseover", (event: MouseEvent, d: { index: number }) => {
      node.style("opacity", (o) => {
        return linked(d.index, o.index) ? 1 : 0.1;
      });
      link.style("opacity", function (o) {
        return o.source.index === d.index || o.target.index === d.index
          ? 1
          : 0.1;
      });
    })
    .on("mouseout", unfocus);

  function focusNeighbours(d, event: MouseEvent) {}

  function unfocus() {
    // labelNode.attr("display", "block");
    node.style("opacity", 1);
    link.style("opacity", 1);
  }

  simulation.on("tick", () => {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
  });

  function zoomed({ transform }) {
    node.attr("transform", transform);
    link.attr("transform", transform);
  }
  svg.call(
    d3
      .zoom()
      .extent([
        [0, 0],
        [width, height],
      ])
      .scaleExtent([0.5, 10])
      .on("zoom", zoomed)
  );
};
