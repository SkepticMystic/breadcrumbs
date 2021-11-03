import type { Graph } from "graphlib";
import { ItemView, WorkspaceLeaf } from "obsidian";
import { VIEW_TYPE_BREADCRUMBS_STATS } from "src/constants";
import type BreadcrumbsPlugin from "src/main";
import Stats from "./Components/Stats.svelte";

export default class StatsView extends ItemView {
  private plugin: BreadcrumbsPlugin;
  private view: Stats;

  constructor(leaf: WorkspaceLeaf, plugin: BreadcrumbsPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  async onload(): Promise<void> {
    super.onload();
    await this.plugin.saveSettings();
    await this.draw();
  }

  getViewType() {
    return VIEW_TYPE_BREADCRUMBS_STATS;
  }
  getDisplayText() {
    return "Breadcrumbs Stats";
  }

  icon = "info";

  async onOpen(): Promise<void> {}

  onClose(): Promise<void> {
    if (this.view) {
      this.view.$destroy();
    }
    return Promise.resolve();
  }

  // ANCHOR Remove duplicate implied links

  dfsAllPaths(g: Graph, startNode: string): string[][] {
    const queue: { node: string; path: string[] }[] = [
      { node: startNode, path: [] },
    ];
    const pathsArr: string[][] = [];

    let i = 0;
    while (queue.length > 0 && i < 1000) {
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

  async draw(): Promise<void> {
    this.contentEl.empty();

    this.view = new Stats({
      target: this.contentEl,
      props: { plugin: this.plugin },
    });
  }
}
