import * as d3 from "d3";
import type Graph from "graphology";
import { openOrSwitch } from "obsidian-community-lib";
import type { d3Node } from "../interfaces";
import { graphlibToD3, VisModal } from "./VisModal";
import type { TFile } from "obsidian";

export const forceDirectedG = (
  graph: Graph,
  currFile: TFile,
  modal: VisModal,
  width: number,
  height: number
) => {
  const { settings } = modal.plugin;
  let nodeToGetTo = currFile.basename;
  console.log({ nodeToGetTo });

  console.time("Find all paths");
  // let pathsFromNodeToGetTo = graphlib.alg.dijkstra(graph, nodeToGetTo);
  console.timeEnd("Find all paths");

  const defaultNodeColour = getComputedStyle(document.body).getPropertyValue(
    "--text-accent"
  );
  let currNodeColour = defaultNodeColour;

  const colourChangeInput = d3
    .select(".d3-graph")
    .append("input")
    .attr("type", "color");

  colourChangeInput.on("change", function changeColor(el) {
    currNodeColour = el.target.value;
    node
      .transition()
      .duration(300)
      .style("fill", (d) => {
        if (d.index === currNodeIndex) return;
        return currNodeColour;
      });
  });

  // const saveLayoutButton = modal.contentEl.createEl('button', { text: 'Save Layout' })
  //   .addEventListener('click', saveGraph)

  const data = graphlibToD3(graph);

  const links: {
    index: number;
    source: { index: number; x: number; y: number };
    target: { index: number; x: number; y: number };
  }[] = data.links.map((d) => Object.create(d));

  const currNode = data.nodes.find((node) => node.name === currFile.basename);
  let currNodeIndex: number;
  if (!currNode) {
    const id = data.nodes.length;
    data.nodes.push({ id, name: currFile.basename });
    currNodeIndex = id;
  } else {
    currNodeIndex = currNode.id;
  }

  const nodes = data.nodes.map((d) => Object.create(d));

  const simulation = d3
    .forceSimulation(nodes)
    .force(
      "link",
      d3.forceLink(links).id((d) => d.id)
    )
    .force("charge", d3.forceManyBody().strength(-8))
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
    .selectAll("circle")
    .data(nodes)
    .join("circle")

    .attr("r", 5)
    .attr("fill", (d) => {
      if (nameFromIndex(d) === currFile.basename) {
        return "#ffffff";
      } else {
        return currNodeColour;
      }
    })
    .call(drag(simulation));

  node.attr("aria-label", (d: d3Node) => d.name);

  const nodeClick = (event: MouseEvent, dest: string) => {
    openOrSwitch(app, dest, event);
    modal.close();
  };
  node.on("click", (event: MouseEvent, d: d3Node) => {
    nodeClick(event, d.name);
  });

  node.on("mousedown", (event: MouseEvent, d) => {
    if (event.button === 2) {
      nodeToGetTo = d.name;

      node.style("fill", (n) => {
        if (n.name === nodeToGetTo) {
          return "#ff0000";
        } else return currNodeColour;
      });

      // pathsFromNodeToGetTo = graphlib.alg.dijkstra(graph, nodeToGetTo);
    }
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

  // function walkDijkstraPaths(
  //   paths: { [node: string]: graphlib.Path },
  //   startNode: string
  // ) {
  //   if (startNode === nodeToGetTo || paths[startNode].distance === Infinity)
  //     return [];
  //   let step = startNode;

  //   const path: string[] = [startNode];
  //   let i = 0;
  //   const MAX = 300;
  //   while (paths[step].predecessor !== nodeToGetTo && i < MAX) {
  //     i++;
  //     step = paths[step].predecessor;
  //     path.push(step);
  //   }
  //   if (i >= MAX) return [];
  //   path.push(nodeToGetTo);
  //   return path;
  // }

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
      // const path = walkDijkstraPaths(pathsFromNodeToGetTo, hoveredNode);
      // if (path.length) {
      //   link
      //     .transition()
      //     .duration(150)
      //     .style("stroke", function (link) {
      //       if (
      //         path.includes(nameFromIndex(link.source)) &&
      //         path.includes(nameFromIndex(link.target))
      //       )
      //         return currNodeColour;
      //     })
      //     .style("opacity", function (link) {
      //       if (
      //         path.includes(nameFromIndex(link.source)) &&
      //         path.includes(nameFromIndex(link.target))
      //       )
      //         return 1;
      //     });
      // }
    })
    .on("mouseout", unfocus);

  function focusNeighbours(d, event: MouseEvent) { }

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

  function saveGraph() {
    const clone = svg.clone(true);
    localStorage.setItem("FDG", JSON.stringify(clone));
  }
};
