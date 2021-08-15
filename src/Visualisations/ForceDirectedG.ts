import * as d3 from "d3";
import type { Graph } from "graphlib";
import * as graphlib from "graphlib";
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
  const pathsFromCurrNode = graphlib.alg.dijkstra(graph, currFile.basename);

  const nodeColour = getComputedStyle(document.body).getPropertyValue(
    "--text-accent"
  );
  const colourChange = d3
    .select(".d3-graph")
    .append("input")
    .attr("height", 100)
    .attr("width", 100)
    .attr("type", "color")
    // Doesn't seem to work...
    .attr("value", nodeColour);

  colourChange.on("change", function changeColor(el) {
    const colour = el.target.value;
    node
      .transition()
      .duration(300)
      .style("fill", (d) => {
        if (d.index === currNodeIndex) return;
        return colour;
      })
      .attr("stroke", (d) => {
        if (d.index === currNodeIndex) return;
        return colour;
      });
  });

  const data = graphlibToD3(graph);

  const links: {
    index: number;
    source: { index: number; x: number; y: number };
    target: { index: number; x: number; y: number };
  }[] = data.links.map((d) => Object.create(d));

  const nodes = data.nodes.map((d) => Object.create(d));
  const currNodeIndex = data.nodes.find(
    (node) => node.name === currFile.basename
  ).id;

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

  const nameFromIndex = (d: { index: number }) =>
    data.nodes.find((node) => node.id === d.index).name;

  const indexFromName = (name: string): number =>
    data.nodes.find((node) => node.name === name).id;

  const node: d3.Selection<
    d3.BaseType | SVGCircleElement,
    any,
    SVGGElement,
    unknown
  > = svg
    .append("g")
    .attr("stroke-width", 1.5)
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("stroke", (d) => {
      if (nameFromIndex(d) === currFile.basename) {
        return "#ffffff";
      } else {
        return nodeColour;
      }
    })
    .attr("r", 5)
    .attr("fill", (d) => {
      if (nameFromIndex(d) === currFile.basename) {
        return "#ffffff";
      } else {
        return nodeColour;
      }
    })
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

  function walkDijkstraPaths(
    paths: { [node: string]: graphlib.Path },
    startNode: string
  ) {
    if (
      startNode === currFile.basename ||
      paths[startNode].distance === Infinity
    )
      return [];
    let step = startNode;

    const path: string[] = [startNode];
    let i = 0;
    while (paths[step].distance > 1 && i < 200) {
      i++;
      step = paths[startNode].predecessor;
      path.push(step);
    }
    if (i >= 200) return [];
    path.push(currFile.basename);
    return path;
  }

  node
    .on("mouseover", (event: MouseEvent, d: { index: number }) => {
      node
        .transition()
        .duration(150)
        .style("opacity", (o) => {
          return linked(d.index, o.index) ? 1 : 0.2;
        });
      link
        .transition()
        .duration(150)
        .style("opacity", function (o) {
          return o.source.index === d.index || o.target.index === d.index
            ? 1
            : 0.2;
        });

      // Highlight path from hovered node to currNode
      const hoveredNode = nameFromIndex(d);
      const path = walkDijkstraPaths(pathsFromCurrNode, hoveredNode);
      if (path.length) {
        link
          .transition()
          .duration(150)
          .style("stroke", function (link) {
            if (
              path.includes(nameFromIndex(link.source)) &&
              path.includes(nameFromIndex(link.target))
            )
              return nodeColour;
          });
      }
    })
    .on("mouseout", unfocus);

  function focusNeighbours(d, event: MouseEvent) {}

  function unfocus() {
    // labelNode.attr("display", "block");
    node.style("opacity", 1);
    link.style("opacity", 1).style("stroke", "#868282");
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
