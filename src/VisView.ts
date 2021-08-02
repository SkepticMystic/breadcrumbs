import * as d3 from "d3";
import { createTreeHierarchy } from "hierarchy-js";

import type { Graph } from "graphlib";
import { ItemView, WorkspaceLeaf } from "obsidian";
import type { d3Tree } from "src/interfaces";
import {
  DATAVIEW_INDEX_DELAY,
  VIEW_TYPE_BREADCRUMBS_STATS,
} from "src/constants";
import type BreadcrumbsPlugin from "src/main";
import Stats from "./Components/Stats.svelte";

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

  

  toTree(g: Graph): d3Tree {
    const topLevelNodes = g.sinks();

    const tree: d3Tree = { name: "top", children: [] };
    if (topLevelNodes.length) {
      topLevelNodes.forEach((node) => {
        const dfsPaths = this.dfsAllPaths(g, node);
        dfsPaths.forEach((path) => {
          path.forEach((step) => {
            const child: d3Tree = { name: step };
            tree.children.push();
          });
        });
      });
    }
  }

  async draw(): Promise<void> {
    this.contentEl.empty();
  }
}
