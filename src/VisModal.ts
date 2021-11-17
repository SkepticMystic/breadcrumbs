import * as d3 from "d3";
import type Graph from "graphology";
import { App, Modal, Notice } from "obsidian";
import type { AdjListItem, d3Graph } from "src/interfaces";
import type BreadcrumbsPlugin from "src/main";
import { getSinks } from "src/sharedFunctions";
import VisComp from "./Components/VisComp.svelte";

export function graphlibToD3(g: Graph): d3Graph {
  const d3Graph: d3Graph = { nodes: [], links: [] };
  const edgeIDs = {};

  g.nodes().forEach((node, i) => {
    d3Graph.nodes.push({ id: i, name: node });
    edgeIDs[node] = i;
  });
  g.forEachEdge((k, a, s, t) => {
    d3Graph.links.push({
      source: edgeIDs[s],
      target: edgeIDs[t],
    });
  });
  return d3Graph;
}

export function bfsFromAllSinks(g: Graph) {
  const queue: string[] = getSinks(g);
  const adjList: AdjListItem[] = [];

  let i = 0;
  while (queue.length && i < 1000) {
    i++;

    const currNode = queue.shift();
    const newNodes = g.inNeighbors(currNode);

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
    const newNodes = g.outNeighbors(currNode);

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
      succs: g.outNeighbors(currNode),
      pres: g.inNeighbors(currNode),
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

  let depth = 1;
  let i = 0;
  while (queue.length && i < 1000) {
    i++;

    const currNode = queue.shift();
    const next = g.outNeighbors(currNode);

    if (next.length) {
      queue.unshift(...next);
      next.forEach((succ) => {
        const parentId = nodeCount * nodes.indexOf(succ);
        if (
          !adjList.some(
            (adjItem) =>
              adjItem.name === currNode && adjItem.parentId === parentId
          )
        ) {
          adjList.push({
            id: visits[currNode] as number,
            name: currNode,
            parentId,
            depth,
          });
          visits[currNode]++;
        }
      });
      depth++;
    } else {
      adjList.push({
        id: visits[currNode] as number,
        name: currNode,
        parentId: 999999999,
        depth,
      });
      depth = 1;
      visits[currNode]++;
    }
  }
  adjList.push({
    id: 999999999,
    name: "CONTAINER",
    parentId: undefined,
    depth: 0,
  });

  const maxDepth = adjList.sort((a, b) => a.depth - b.depth).last().depth;
  adjList.forEach((item) => (item.height = maxDepth - item.depth));

  console.log({ visits });
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
