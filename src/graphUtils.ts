import Graph, { MultiGraph } from "graphology";
import { dfsFromNode } from "graphology-traversal";
import type { Attributes } from "graphology-types";
import type { App } from "obsidian";
// import { DIRECTIONS } from "./constants";
import type { Directions, UserHier } from "./interfaces";

// TODO - this is a hack to get the graph to work with the approvals
// I shouldn't need
const DIRECTIONS = ["up", "same", "down", "next", "prev"];
// This function takes the real & implied graphs for a given relation, and returns a new graphs with both.
// It makes implied relations real
// TODO use reflexiveClosure instead
export function closeImpliedLinks(
  real: MultiGraph,
  implied: MultiGraph
): MultiGraph {
  const closedG = real.copy();
  implied.forEachEdge((key, a, s, t) => {
    closedG.mergeEdge(t, s, a);
  });
  return closedG;
}

export function currFile(app: App) {
  return app.vault.getMarkdownFiles();
}

export function removeUnlinkedNodes(g: MultiGraph) {
  const copy = g.copy();
  copy.forEachNode((node) => {
    if (!copy.degree(node)) copy.dropNode(node);
  });
  return copy;
}

/**
 * Return a subgraph of all nodes & edges with `dirs.includes(a.dir)`
 * @param  {MultiGraph} main
 * @param  {Directions} dir
 */
export function getSubInDirs(main: MultiGraph, ...dirs: Directions[]) {
  const sub = new MultiGraph();
  main?.forEachEdge((k, a, s, t) => {
    if (dirs.includes(a.dir)) {
      //@ts-ignore
      addNodesIfNot(sub, [s, t], a);
      sub.addEdge(s, t, a);
    }
  });
  return sub;
}

/**
 * Return a subgraph of all nodes & edges with `files.includes(a.field)`
 * @param  {MultiGraph} main
 * @param  {string[]} fields
 */
export function getSubForFields(main: MultiGraph, fields: string[]) {
  const sub = new MultiGraph();
  main.forEachEdge((k, a, s, t) => {
    if (fields.includes(a.field)) {
      //@ts-ignore
      addNodesIfNot(sub, [s, t], a);
      sub.addEdge(s, t, a);
    }
  });
  return sub;
}

/**
 * For every edge in `g`, add the reverse of the edge to a copy of `g`.
 *
 * It also sets the attrs of the reverse edges to `oppDir` and `oppFields[0]`
 * @param  {MultiGraph} g
 * @param  {UserHier[]} userHiers
 * @param  {boolean} closeAsOpposite
 */
export function getReflexiveClosure(
  g: MultiGraph,
  userHiers: UserHier[],
  closeAsOpposite: boolean = true
): MultiGraph {
  const copy = g.copy();
  copy.forEachEdge((k, a, s, t) => {
    const { dir, field } = a;
    if (field === undefined) return;
    const oppDir = getOppDir(dir);
    const oppField = getOppFields(userHiers, field)[0];

    addNodesIfNot(copy, [s, t], {
      //@ts-ignore
      dir: closeAsOpposite ? oppDir : dir,
      field: closeAsOpposite ? oppField : field,
    });
    addEdgeIfNot(copy, t, s, {
      //@ts-ignore
      dir: closeAsOpposite ? oppDir : dir,
      field: closeAsOpposite ? oppField : field,
    });
  });
  return copy;
}

export function addNodesIfNot(
  g: MultiGraph,
  nodes: string[],
  attr = { order: 9999 }
) {
  for (const node of nodes) {
    g.updateNode(node, (exstantAttrs) => {
      const extantOrder: number | undefined = exstantAttrs.order;
      return {
        ...exstantAttrs,
        order: extantOrder && extantOrder < 9999 ? extantOrder : attr.order,
      };
    });
  }
}

export function addEdgeIfNot(
  g: MultiGraph,
  source: string,
  target: string,
  attr?: Attributes
) {
  if (!g.hasEdge(source, target)) g.addEdge(source, target, attr);
}

export const getSinks = (g: MultiGraph) =>
  g.filterNodes((node) => g.hasNode(node) && !g.outDegree(node));

export const getSources = (g: MultiGraph) =>
  g.filterNodes((node) => g.hasNode(node) && !g.inDegree(node));

export const getOutNeighbours = (g: MultiGraph, node: string) =>
  g.hasNode(node) ? g.outNeighbors(node) : [];
export const getInNeighbours = (g: MultiGraph, node: string) =>
  g.hasNode(node) ? g.inNeighbors(node) : [];

export const getOppDir = (dir: Directions): Directions => {
  switch (dir) {
    case "up":
      return "down";
    case "down":
      return "up";
    case "same":
      return "same";
    case "next":
      return "prev";
    case "prev":
      return "next";
  }
};

/**
 *  Get the hierarchy and direction that `field` is in
 * */
export function getFieldInfo(userHiers: UserHier[], field: string) {
  let fieldDir: Directions;
  let fieldHier: UserHier;

  DIRECTIONS.forEach((dir: Directions) => {
    userHiers.forEach((hier) => {
      if (hier[dir].includes(field)) {
        fieldDir = dir;
        fieldHier = hier;
        return;
      }
    });
  });
  return { fieldHier, fieldDir };
}

export function getOppFields(userHiers: UserHier[], field: string) {
  const { fieldHier, fieldDir } = getFieldInfo(userHiers, field);
  const oppDir = getOppDir(fieldDir);
  return fieldHier[oppDir];
}

export function dfsAllPaths(g: MultiGraph, startNode: string): string[][] {
  const queue: { node: string; path: string[] }[] = [
    { node: startNode, path: [] },
  ];
  const visited: { [note: string]: number } = {};
  const allPaths: string[][] = [];

  let i = 0;
  while (queue.length > 0 && i < 1000) {
    i++;
    const { node, path } = queue.shift();

    const extPath = [node, ...path];
    const succsNotVisited = g.hasNode(node)
      ? g.filterOutNeighbors(
          node,
          (succ) => !visited[succ] || visited[succ] < 5
        )
      : [];
    const newItems = succsNotVisited.map((succ) => {
      visited[succ] = visited[succ] ? visited[succ] + 1 : 1;
      return { node: succ, path: extPath };
    });

    queue.unshift(...newItems);

    if (!g.hasNode(node) || !g.outDegree(node)) allPaths.push(extPath);
  }
  return allPaths;
}

export function removeCycles(g: Graph, startNode: string) {
  const copy = g.copy();
  let prevNode = null;
  dfsFromNode(copy, startNode, (n) => {
    copy.forEachOutNeighbor(n, (t) => {
      if (t === prevNode && copy.hasEdge(t, prevNode)) {
        copy.dropEdge(t, prevNode);
      }
    });

    prevNode = n;
  });
  return copy;
}

export function getSubCloseSub(
  g: MultiGraph,
  userHiers: UserHier[],
  ...dirs: Directions[]
) {
  const sub = getSubInDirs(g, ...dirs);
  const closed = getReflexiveClosure(sub, userHiers);
  const closedSub = getSubInDirs(closed, dirs[0]);
  return closedSub;
}
