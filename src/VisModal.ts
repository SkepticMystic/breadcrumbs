import * as d3 from "d3";
import type { Graph } from "graphlib";
import { App, Modal, Notice } from "obsidian";
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
import { arcDiagram } from "src/Visualisations/ArcDiagram";
import { circlePacking } from "src/Visualisations/CirclePacking";
import { edgeBundling } from "src/Visualisations/EdgeBundling";
import { forceDirectedG } from "src/Visualisations/ForceDirectedG";
import { sunburst } from "src/Visualisations/Sunburst";
import { tidyTree } from "src/Visualisations/TidyTree";
import { treeMap } from "src/Visualisations/TreeMap";
import { icicle } from "src/Visualisations/Icicle";

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
    const neighbours = {
      succs: g.successors(currNode) as string[],
      pres: g.predecessors(currNode) as string[],
    };
    console.log({ currNode, neighbours });

    const next: AdjListItem = {
      name: currNode,
      pres: undefined,
      succs: undefined,
      parentId: i,
      depth: i,
    };
    if (neighbours.succs.length) {
      next.succs = neighbours.succs;
      queue.push(...neighbours.succs);
    }
    if (neighbours.pres.length) {
      next.pres = neighbours.pres;
    }
    adjList.push(next);
  }
  const maxDepth = adjList.sort((a, b) => a.depth - b.depth).last().depth;
  adjList.forEach((item) => (item.height = maxDepth - item.depth));

  return adjList;
}

export function dfsFlatAdjList(g: Graph, startNode: string) {
  const nodes = g.nodes();
  const nodeCount = nodes.length;
  const visits = {};
  nodes.forEach((node, i) => {
    visits[node] = nodeCount * i;
  });

  const queue: string[] = [startNode];
  const adjList: AdjListItem[] = [];

  let i = 0;
  while (queue.length && i < 1000) {
    i++;

    const currNode = queue.shift();
    const neighbours = {
      succs: g.successors(currNode) as string[],
      // pres: g.predecessors(currNode) as string[],
    };
    if (neighbours.succs.length) {
      queue.push(...neighbours.succs);
      neighbours.succs.forEach((succ, j) => {
        visits[currNode]++;
        adjList.push({
          id: visits[currNode] as number,
          name: currNode,
          parentId: (visits[succ] + 1) as number,
          depth: i,
        });
      });
    } else {
      visits[currNode]++;
      adjList.push({
        id: visits[currNode] as number,
        name: currNode,
        parentId: 999999999,
        depth: i,
      });
    }
  }
  adjList.push({
    id: 999999999,
    name: "CONTAINER",
    parentId: undefined,
    depth: i + 1,
  });

  const maxDepth = adjList.sort((a, b) => a.depth - b.depth).last().depth;
  adjList.forEach((item) => (item.height = maxDepth - item.depth));

  console.log({ visits });
  return adjList;
}

export const tod3Hierarchy = (adjList: AdjListItem[]): d3Tree => {
  // parentId doesn't necessarily mean parent here. It means successor of the node in the graph it was generated from.
  const hier: d3Tree = { name: "Root", children: [] };

  adjList.forEach((item) => {});
};

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
      "Arc Diagram": {
        fun: arcDiagram,
        argArr: [graph, this.app, currFile, this.modal, width, height],
      },
      Sunburst: {
        fun: sunburst,
        argArr: [graph, this.app, currFile, this.modal, width, height],
      },
      "Tree Map": {
        fun: treeMap,
        argArr: [graph, this.app, currFile, this.modal, width, height],
      },
      Icicle: {
        fun: icicle,
        argArr: [graph, this.app, currFile, this.modal, width, height],
      },
    };

    types[type].fun(...types[type].argArr);
  }

  onClose() {
    this.contentEl.empty();
  }
}
