import * as d3 from "d3";
import type { Graph } from "graphlib";
import { App, Modal, Notice } from "obsidian";
import type { AdjListItem, d3Graph, d3Tree, visTypes } from "src/interfaces";
import type BreadcrumbsPlugin from "src/main";
import { arcDiagram } from "src/Visualisations/ArcDiagram";
import { circlePacking } from "src/Visualisations/CirclePacking";
import { edgeBundling } from "src/Visualisations/EdgeBundling";
import { forceDirectedG } from "src/Visualisations/ForceDirectedG";
import { icicle } from "src/Visualisations/Icicle";
import { sunburst } from "src/Visualisations/Sunburst";
import { tidyTree } from "src/Visualisations/TidyTree";
import { treeMap } from "src/Visualisations/TreeMap";
import VisComp from "./Components/VisComp.svelte";

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
      queue.unshift(...neighbours.succs);
      neighbours.succs.forEach((succ) => {
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
      "Alot of these features may not work, it is still very experimental."
    );
    let { contentEl } = this;
    contentEl.empty();

    new VisComp({
      target: contentEl,
      props: {
        modal: this,
        settings: this.plugin.settings,
      },
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}
