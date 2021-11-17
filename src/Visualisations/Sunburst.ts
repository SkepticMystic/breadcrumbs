import * as d3 from "d3";
import type Graph from "graphology";
import type { App, TFile } from "obsidian";
import type { VisModal } from "src/VisModal";
import { dfsFlatAdjList } from "src/VisModal";

export const sunburst = (
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

  var radius = Math.min(width, height) / 2; // < -- 2
  var color = d3.scaleOrdinal(d3.schemeCategory10);

  var g = d3
    .select("svg") // <-- 1
    .attr("width", width) // <-- 2
    .attr("height", height)
    .append("g") // <-- 3
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")"); // <-- 4

  var g = d3
    .select("svg") // returns a handle to the <svg> element
    .attr("width", width) // sets the width of <svg> and then returns the <svg> element again
    .attr("height", height) // (same as width)
    .append("g") // adds a <g> element to the <svg> element. It returns the <g> element
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")"); // takes the <g> element and moves the [0,0] center over and down

  var g = d3
    .select("svg") // --> <svg></svg>
    .attr("width", width) // --> <svg width="500"></svg>
    .attr("height", height) // --> <svg width="500" height="500"></svg>
    .append("g") // --> <svg width="500" height="500"><g></g></svg>
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")"); // --> <svg width="500" height="500"><g transform="translate(250,250)"></g></svg>

  var partition = d3
    .partition() // <-- 1
    .size([2 * Math.PI, radius]); // <-- 2

  var root = d3
    .hierarchy(hierarchy) // <-- 1
    .sum(function (d) {
      return d.height;
    }); // <-- 2

  partition(root); // <-- 1
  var arc = d3
    .arc() // <-- 2
    .startAngle(function (d) {
      return d.x0;
    })
    .endAngle(function (d) {
      return d.x1;
    })
    .innerRadius(function (d) {
      return d.y0;
    })
    .outerRadius(function (d) {
      return d.y1;
    });

  g.selectAll("path") // <-- 1
    .data(root.descendants()) // <-- 2
    .enter() // <-- 3
    .append("path") // <-- 4
    .attr("display", function (d) {
      return d.depth ? null : "none";
    }) // <-- 5
    .attr("d", arc) // <-- 6
    .style("stroke", "#fff") // <-- 7
    .style("fill", function (d) {
      return color((d.children ? d : d.parent).data.name);
    }); // <-- 8
};
