import * as d3 from "d3";
import _ from "lodash";
import type { Graph } from "graphlib";
import { createTreeHierarchy } from "hierarchy-js";
import { App, Modal, Notice, TFile } from "obsidian";
import { ALLUNLINKED, REAlCLOSED, RELATIONS, VISTYPES } from "src/constants";
import type {
  AdjListItem,
  d3Graph,
  d3Tree,
  VisGraphs,
  visTypes,
} from "src/interfaces";
import type BreadcrumbsPlugin from "src/main";
import { closeImpliedLinks, removeUnlinkedNodes } from "src/sharedFunctions";
import { circlePacking } from "src/Visualisations/CirclePacking";
import { edgeBundling } from "src/Visualisations/EdgeBundling";
import { forceDirectedG } from "src/Visualisations/ForceDirectedG";
import { tidyTree } from "src/Visualisations/TidyTree";

export function graphlibToD3(g: Graph): d3Graph {
  const d3Graph: d3Graph = { nodes: [], links: [] };
  const edgeIDs = {};

  g.nodes().forEach((node, i) => {
    d3Graph.nodes.push({ id: i, name: node });
    edgeIDs[node] = i;
  });
  g.edges().forEach((edge) => {
    d3Graph.links.push({
      source: edgeIDs[edge.v],
      target: edgeIDs[edge.w],
    });
  });
  return d3Graph;
}

export function bfsFromAllSinks(g: Graph) {
  const queue: string[] = g.sinks();
  const adjList: AdjListItem[] = [];

  let i = 0;
  while (queue.length && i < 1000) {
    i++;

    const currNode = queue.shift();
    const newNodes = g.predecessors(currNode) as string[];

    if (newNodes.length) {
      newNodes.forEach((pre) => {
        const next: AdjListItem = {
          name: currNode,
          parentId: pre,
          depth: i,
        };
        queue.push(pre);
        adjList.push(next);
      });
    } else {
      adjList.push({
        name: currNode,
        parentId: undefined,
        depth: i,
      });
    }
  }

  const maxDepth = adjList.sort((a, b) => a.depth - b.depth).last().depth;
  adjList.forEach((item) => (item.height = maxDepth - item.depth));
  return adjList;
}

export function dfsAdjList(g: Graph, startNode: string): AdjListItem[] {
  const queue: string[] = [startNode];
  const adjList: AdjListItem[] = [];

  let i = 0;
  while (queue.length && i < 1000) {
    i++;

    const currNode = queue.shift();
    const newNodes = g.successors(currNode) as string[];

    if (newNodes.length) {
      newNodes.forEach((succ) => {
        const next: AdjListItem = {
          name: currNode,
          parentId: succ,
          depth: i,
        };
        queue.push(succ);
        adjList.push(next);
      });
    } else {
      adjList.push({
        name: currNode,
        parentId: undefined,
        depth: i,
      });
    }
  }
  const maxDepth = adjList.sort((a, b) => a.depth - b.depth).last().depth;
  adjList.forEach((item) => (item.height = maxDepth - item.depth));

  return adjList;
}

export function bfsAdjList(g: Graph, startNode: string): AdjListItem[] {
  const queue: string[] = [startNode];
  const adjList: AdjListItem[] = [];

  let i = 0;
  while (queue.length && i < 1000) {
    i++;

    const currNode = queue.shift();
    const newNodes = g.successors(currNode) as string[];
    console.log({ currNode, newNodes });

    if (newNodes.length) {
      newNodes.forEach((succ) => {
        const next: AdjListItem = {
          name: currNode,
          parentId: succ,
          depth: i,
        };
        queue.push(succ);
        adjList.push(next);
      });
    } else {
      adjList.push({
        name: currNode,
        parentId: undefined,
        depth: i,
      });
    }
  }
  const maxDepth = adjList.sort((a, b) => a.depth - b.depth).last().depth;
  adjList.forEach((item) => (item.height = maxDepth - item.depth));

  return adjList;
}

export const stratify = d3
  .stratify()
  .id(function (d: AdjListItem) {
    console.log({ d });
    return d.name;
  })
  .parentId(function (d: AdjListItem) {
    return d.parentId;
  });
export class VisModal extends Modal {
  plugin: BreadcrumbsPlugin;
  modal: VisModal;

  constructor(app: App, plugin: BreadcrumbsPlugin) {
    super(app);
    this.plugin = plugin;
    this.modal = this;
  }

  onOpen() {
    new Notice(
      "Most of the visualisations don't work. This feature is still very experimental."
    );
    let { contentEl } = this;
    contentEl.empty();

    contentEl.style.width = `${Math.round(window.innerWidth / 1.3)}px`;
    contentEl.style.height = `${Math.round(window.innerHeight / 1.3)}px`;

    const optionsDiv = contentEl.createDiv({ cls: "vis-view-options" });

    optionsDiv.createSpan({ text: "Graph:" });
    const graphSelect = optionsDiv.createEl("select");
    VISTYPES.forEach((type) => {
      graphSelect.createEl("option", { value: type, text: type });
    });
    graphSelect.value = this.plugin.settings.visGraph;

    optionsDiv.createSpan({ text: "Relation:" });
    const relationSelect = optionsDiv.createEl("select");
    RELATIONS.forEach((type) => {
      relationSelect.createEl("option", { value: type, text: type });
    });
    relationSelect.value = this.plugin.settings.visRelation;

    optionsDiv.createSpan({ text: "Close Implied:" });
    const closedSelect = optionsDiv.createEl("select");
    REAlCLOSED.forEach((type) => {
      closedSelect.createEl("option", { value: type, text: type });
    });
    closedSelect.value = this.plugin.settings.visClosed;

    optionsDiv.createSpan({ text: "Unlinked:" });
    const unlinkedSelect = optionsDiv.createEl("select");
    ALLUNLINKED.forEach((type) => {
      unlinkedSelect.createEl("option", { value: type, text: type });
    });
    unlinkedSelect.value = this.plugin.settings.visAll;

    const d3GraphDiv = contentEl.createDiv({
      cls: "d3-graph",
    });

    const { gParents, gSiblings, gChildren } = this.plugin.currGraphs;

    const [closedParentNoSingle, closedSiblingNoSingle, closedChildNoSingle] = [
      closeImpliedLinks(gParents, gChildren),
      closeImpliedLinks(gSiblings, gSiblings),
      closeImpliedLinks(gChildren, gParents),
    ];

    const graphs: VisGraphs = {
      Parent: {
        Real: {
          All: gParents,
          "No Unlinked": removeUnlinkedNodes(gParents),
        },
        Closed: {
          All: closedParentNoSingle,
          "No Unlinked": removeUnlinkedNodes(closedParentNoSingle),
        },
      },
      Sibling: {
        Real: {
          All: gSiblings,
          "No Unlinked": removeUnlinkedNodes(gSiblings),
        },
        Closed: {
          All: closedSiblingNoSingle,
          "No Unlinked": removeUnlinkedNodes(closedSiblingNoSingle),
        },
      },
      Child: {
        Real: {
          All: gChildren,
          "No Unlinked": removeUnlinkedNodes(gChildren),
        },
        Closed: {
          All: closedChildNoSingle,
          "No Unlinked": removeUnlinkedNodes(closedChildNoSingle),
        },
      },
    };

    [relationSelect, closedSelect, unlinkedSelect, graphSelect].forEach(
      (selector) =>
        selector.addEventListener("change", () => {
          d3GraphDiv.empty();
          this.draw(
            graphs[relationSelect.value][closedSelect.value][
              unlinkedSelect.value
            ],
            graphSelect.value as visTypes
          );
        })
    );

    // Draw the default value onOpen
    this.draw(
      graphs[relationSelect.value][closedSelect.value][unlinkedSelect.value],
      graphSelect.value as visTypes
    );
  }

  draw(graph: Graph, type: visTypes) {
    let { contentEl } = this;

    const currFile = this.app.workspace.getActiveFile();

    const width = parseInt(contentEl.style.width) - 10;
    const height = parseInt(contentEl.style.height) - 40;

    const forceDirectedT = (graph: Graph) => {
      const data = graphlibToD3(graph);

      // const links = data.links.map((d) => Object.create(d));
      // const nodes = data.nodes.map((d) => Object.create(d));

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

      const root = d3.hierarchy(hierarchy);
      const links = root.links();
      const nodes = root.descendants();

      const drag = (simulation) => {
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

      const simulation = d3
        .forceSimulation(nodes)
        .force(
          "link",
          d3
            .forceLink(links)
            .id((d) => d.id)
            .distance(0)
            .strength(1)
        )
        .force("charge", d3.forceManyBody().strength(-50));
      // .force("x", d3.forceX())
      // .force("y", d3.forceY());

      const svg = d3
        .select(".d3-graph")
        .append("svg")
        .attr("height", Math.round(screen.height / 1.3))
        .attr("width", contentEl.clientWidth);

      const link = svg
        .append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(links)
        .join("line");

      const node = svg
        .append("g")
        .attr("fill", "#fff")
        .attr("stroke", "#000")
        .attr("stroke-width", 1.5)
        .selectAll("circle")
        .data(nodes)
        .join("circle")
        .attr("fill", (d) => (d.children ? null : "#000"))
        .attr("stroke", (d) => (d.children ? null : "#fff"))
        .attr("r", 3.5)
        .call(drag(simulation));

      node.append("title").text((d) => d.data.name);

      simulation.on("tick", () => {
        link
          .attr("x1", (d) => d.source.x)
          .attr("y1", (d) => d.source.y)
          .attr("x2", (d) => d.target.x)
          .attr("y2", (d) => d.target.y);

        node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
      });

      // invalidation.then(() => simulation.stop());
    };

    const types: {
      [vis in visTypes]: {
        fun: (...args: any[]) => void;
        argArr: any[];
      };
    } = {
      "Force Directed Graph": {
        fun: forceDirectedG,
        argArr: [graph, this.app, this.modal, width, height],
      },
      "Force Directed Tree": { fun: forceDirectedT, argArr: [graph] },
      "Tidy Tree": {
        fun: tidyTree,
        argArr: [graph, this.app, currFile, this.modal, width, height],
      },
      "Circle Packing": {
        fun: circlePacking,
        argArr: [graph, this.app, currFile, this.modal, width, height],
      },
      "Edge Bundling": {
        fun: edgeBundling,
        argArr: [graph, contentEl, currFile, width, height],
      },
    };

    types[type].fun(...types[type].argArr);
  }

  onClose() {
    this.contentEl.empty();
  }
}
