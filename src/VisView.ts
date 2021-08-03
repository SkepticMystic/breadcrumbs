import * as d3 from "d3";
import type { Graph } from "graphlib";
import { createTreeHierarchy } from "hierarchy-js";
import { cloneDeep } from "lodash";
import { ItemView, WorkspaceLeaf } from "obsidian";
import { closeImpliedLinks } from "src/sharedFunctions";
import { DATAVIEW_INDEX_DELAY } from "src/constants";
import type { AdjListItem, BreadcrumbsSettings, d3Graph } from "src/interfaces";
import type BreadcrumbsPlugin from "src/main";

export default class StatsView extends ItemView {
  private plugin: BreadcrumbsPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: BreadcrumbsPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  async onload(): Promise<void> {
    super.onload();
    await this.plugin.saveSettings();
    this.app.workspace.onLayoutReady(async () => {
      setTimeout(async () => await this.draw(), DATAVIEW_INDEX_DELAY);
    });
  }

  getViewType() {
    return VIEW_TYPE_BREADCRUMBS_VIS;
  }
  getDisplayText() {
    return "Breadcrumbs Visualisations";
  }

  icon = "graph";

  async onOpen(): Promise<void> {
    await this.plugin.saveSettings();
  }

  onClose(): Promise<void> {
    if (this.containerEl) {
      this.containerEl.remove();
    }
    return Promise.resolve();
  }

  dfsAllPaths(g: Graph, startNode: string): string[][] {
    const queue: { node: string; path: string[] }[] = [
      { node: startNode, path: [] },
    ];
    const pathsArr: string[][] = [];

    let i = 0;
    while (queue.length && i < 1000) {
      i++;
      const currPath = queue.shift();

      const newNodes = (g.successors(currPath.node) ?? []) as string[];
      const extPath = [currPath.node, ...currPath.path];
      queue.unshift(
        ...newNodes.map((n: string) => {
          return { node: n, path: extPath };
        })
      );

      if (newNodes.length === 0) {
        pathsArr.push(extPath);
      }
    }
    return pathsArr;
  }

  dfsAdjList(g: Graph, startNode: string): AdjListItem[] {
    const queue: string[] = [startNode];
    const adjList: AdjListItem[] = [];

    let i = 0;
    while (queue.length && i < 1000) {
      i++;

      const currNode = queue.shift();
      const newNodes = (g.successors(currNode) ?? []) as string[];

      newNodes.forEach((succ) => {
        const next: AdjListItem = { name: currNode, parentId: succ };
        queue.unshift(succ);
        adjList.push(next);
      });
    }
    return adjList;
  }

  graphlibToD3(g: Graph): d3Graph {
    const d3Graph: d3Graph = { nodes: [], links: [] };
    const edgeIDs = {};

    g.nodes().forEach((node, i) => {
      d3Graph.nodes.push({ id: i, name: node });
      edgeIDs[node] = i;
    });
    g.edges().forEach((edge) => {
      d3Graph.links.push({ source: edgeIDs[edge.v], target: edgeIDs[edge.w] });
    });
    return d3Graph;
  }

  async draw(): Promise<void> {
    this.contentEl.empty();
    const { gParents, gSiblings, gChildren } = this.plugin.currGraphs;
    const currFile = this.app.workspace.getActiveFile();
    const settings = this.plugin.settings;

    const closedParents = closeImpliedLinks(gParents, gChildren);

    const adjList: AdjListItem[] = this.dfsAdjList(
      closedParents,
      currFile.basename
    );
    console.log({ adjList });

    const noDoubles = adjList.filter(
      (thing, index, self) =>
        index ===
        self.findIndex(
          (t) => t.name === thing.name && t?.parentId === thing?.parentId
        )
    );
    console.log({ noDoubles });
    console.time("tree");
    const hierarchy = createTreeHierarchy(noDoubles, {
      id: "name",
      excludeParent: true,
    });
    console.timeEnd("tree");
    console.log({ hierarchy });

    const data = this.graphlibToD3(closedParents);
    const d3GraphDiv = this.contentEl.createDiv({
      cls: "d3-graph",
      attr: { height: "1000px" },
    });

    const width = 1000;
    const height = 1000;

    const links = data.links.map((d) => Object.create(d));
    const nodes = data.nodes.map((d) => Object.create(d));

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3.forceLink(links).id((d) => d.id)
      )
      .force("charge", d3.forceManyBody())
      .force("center", d3.forceCenter(width / 2, height / 2));

    const svg = d3.select(".d3-graph").append("svg");

    const link = svg
      .append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", (d) => Math.sqrt(d.value));

    const node = svg
      .append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", 5);
    // .attr("fill", color)
    // .call(drag(simulation));

    node.append("title").text((d) => d.id);

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    });
  }
}
