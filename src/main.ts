import { Graph } from "graphlib";
import { addIcon, MarkdownView, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { BreadcrumbsSettingTab } from "src/BreadcrumbsSettingTab";
import {
  DATAVIEW_INDEX_DELAY,
  TRAIL_ICON,
  TRAIL_ICON_SVG,
  VIEW_TYPE_BREADCRUMBS_MATRIX,
} from "src/constants";
import type {
  allGraphs,
  BreadcrumbsSettings,
  neighbourObj,
} from "src/interfaces";
import MatrixView from "src/MatrixView";
import {
  closeImpliedLinks,
  debug,
  getFileFrontmatterArr,
  getNeighbourObjArr,
} from "src/sharedFunctions";
import TrailGrid from "./TrailGrid.svelte";
import TrailPath from "./TrailPath.svelte";

const DEFAULT_SETTINGS: BreadcrumbsSettings = {
  parentFieldName: "parent",
  siblingFieldName: "sibling",
  childFieldName: "child",
  indexNote: [""],
  refreshIntervalTime: 0,
  defaultView: true,
  showNameOrType: true,
  showRelationType: true,
  showTrail: true,
  trailOrTable: 3,
  gridHeatmap: false,
  heatmapColour: getComputedStyle(document.body).getPropertyValue(
    "--text-accent"
  ),
  showAll: false,
  noPathMessage: `This note has no real or implied parents`,
  trailSeperator: "→",
  respectReadableLineLength: true,
  debugMode: false,
  superDebugMode: false,
};

export default class BreadcrumbsPlugin extends Plugin {
  settings: BreadcrumbsSettings;
  visited: [string, HTMLDivElement][];
  refreshIntervalID: number;
  currGraphs: allGraphs;

  async onload(): Promise<void> {
    console.log("loading breadcrumbs plugin");

    await this.loadSettings();

    this.visited = [];

    this.registerView(
      VIEW_TYPE_BREADCRUMBS_MATRIX,
      (leaf: WorkspaceLeaf) => new MatrixView(leaf, this)
    );

    this.app.workspace.onLayoutReady(async () => {
      // this.trailDiv = createDiv()
      setTimeout(async () => {
        this.currGraphs = await this.initGraphs();

        this.initView(VIEW_TYPE_BREADCRUMBS_MATRIX);

        if (this.settings.showTrail) {
          await this.drawTrail();
        }

        this.registerEvent(
          this.app.workspace.on("active-leaf-change", async () => {
            this.currGraphs = await this.initGraphs();
            debug(this.settings, this.currGraphs);
            const activeView = this.getActiveView();
            if (activeView) {
              await activeView.draw();
            }
            if (this.settings.showTrail) {
              await this.drawTrail();
            }
          })
        );

        // ANCHOR autorefresh interval
        if (this.settings.refreshIntervalTime > 0) {
          this.refreshIntervalID = window.setInterval(async () => {
            this.currGraphs = await this.initGraphs();
            if (this.settings.showTrail) {
              await this.drawTrail();
            }
            const activeView = this.getActiveView();
            if (activeView) {
              await activeView.draw();
            }
          }, this.settings.refreshIntervalTime * 1000);
          this.registerInterval(this.refreshIntervalID);
        }
      }, DATAVIEW_INDEX_DELAY);
    });

    addIcon(TRAIL_ICON, TRAIL_ICON_SVG);

    this.addCommand({
      id: "show-breadcrumbs-matrix-view",
      name: "Open Matrix View",
      checkCallback: (checking: boolean) => {
        if (checking) {
          return (
            this.app.workspace.getLeavesOfType(VIEW_TYPE_BREADCRUMBS_MATRIX)
              .length === 0
          );
        }
        this.initView(VIEW_TYPE_BREADCRUMBS_MATRIX);
      },
    });

    this.addSettingTab(new BreadcrumbsSettingTab(this.app, this));
  }

  getActiveView(): MatrixView | null {
    const leaves = this.app.workspace.getLeavesOfType(
      VIEW_TYPE_BREADCRUMBS_MATRIX
    );
    if (leaves && leaves.length >= 1) {
      const view = leaves[0].view;
      if (view instanceof MatrixView) {
        return view;
      }
    }
    return null;
  }

  // SECTION OneSource

  populateGraph(
    g: Graph,
    currFileName: string,
    neighbours: neighbourObj,
    relationship: string
  ): void {
    g.setNode(currFileName, currFileName);
    neighbours[relationship].forEach((node) =>
      g.setEdge(currFileName, node, relationship)
    );
  }

  async initGraphs(): Promise<{
    gParents: Graph;
    gSiblings: Graph;
    gChildren: Graph;
  }> {
    const fileFrontmatterArr = getFileFrontmatterArr(this.app, this.settings);
    const neighbourArr = await getNeighbourObjArr(this, fileFrontmatterArr);
    const [gParents, gSiblings, gChildren] = [
      new Graph(),
      new Graph(),
      new Graph(),
    ];

    neighbourArr.forEach((neighbourObj) => {
      const currFileName = neighbourObj.current.basename;

      this.populateGraph(gParents, currFileName, neighbourObj, "parents");
      this.populateGraph(gSiblings, currFileName, neighbourObj, "siblings");
      this.populateGraph(gChildren, currFileName, neighbourObj, "children");
    });

    return { gParents, gSiblings, gChildren };
  }

  // !SECTION OneSource

  // SECTION Breadcrumbs

  resolvedClass(toFile: string, currFile: TFile): string {
    const { unresolvedLinks } = this.app.metadataCache;
    if (!unresolvedLinks[currFile.path]) {
      return "internal-link breadcrumbs-link";
    }
    return unresolvedLinks[currFile.path][toFile] > 0
      ? "internal-link is-unresolved breadcrumbs-link"
      : "internal-link breadcrumbs-link";
  }

  bfsAllPaths(g: Graph, startNode: string): string[][] {
    const queue: { node: string; path: string[] }[] = [
      { node: startNode, path: [] },
    ];
    const pathsArr: string[][] = [];

    let i = 0;
    while (queue.length !== 0 && i < 1000) {
      i++;
      const currPath = queue.shift();

      const newNodes = (g.successors(currPath.node) ?? []) as string[];
      const extPath = [currPath.node, ...currPath.path];
      queue.push(
        ...newNodes.map((n: string) => {
          return { node: n, path: extPath };
        })
      );
      // terminal node
      if (newNodes.length === 0) {
        pathsArr.push(extPath);
      }
    }
    // Splice off the current note from the path
    pathsArr.forEach((path) => {
      if (path.length) {
        path.splice(path.length - 1, 1);
      }
    });
    debug(this.settings, { pathsArr });
    return pathsArr;
  }

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

  getBreadcrumbs(g: Graph): string[][] | null {
    const currFile = this.app.workspace.getActiveViewOfType(MarkdownView).file;
    if (currFile.extension !== "md") {
      return null;
    }

    const from = currFile.basename;
    const indexNotes: string[] = [this.settings.indexNote].flat();

    let allTrails: string[][] = this.bfsAllPaths(g, from);

    // No index note chosen
    if (indexNotes[0] !== "" && allTrails[0].length > 0) {
      allTrails = allTrails.filter((trail) => indexNotes.includes(trail[0]));
    }
    let sortedTrails = allTrails
      .filter((trail) => trail.length > 0)
      .sort((a, b) => a.length - b.length);

    debug(this.settings, sortedTrails);
    return sortedTrails;
  }

  async drawTrail(): Promise<void> {
    if (!this.settings.showTrail) {
      return;
    }
    const activeMDView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeMDView) {
      return;
    }

    const currFile = activeMDView.file;
    const frontm =
      this.app.metadataCache.getFileCache(currFile)?.frontmatter ?? {};
    if (frontm["kanban-plugin"]) {
      return;
    }

    const settings = this.settings;

    const { gParents, gChildren } = this.currGraphs;
    const closedParents = closeImpliedLinks(gParents, gChildren);
    const sortedTrails = this.getBreadcrumbs(closedParents);
    debug(settings, { sortedTrails });

    // Get the container div of the active note
    const previewView = activeMDView.contentEl.querySelector(
      ".markdown-preview-view"
    );
    // Make sure it's empty
    previewView.querySelector("div.breadcrumbs-trail")?.remove();

    if (sortedTrails.length === 0 && settings.noPathMessage === "") {
      return;
    }

    const trailDiv = createDiv({
      cls: `breadcrumbs-trail ${
        settings.respectReadableLineLength
          ? "is-readable-line-width markdown-preview-sizer markdown-preview-section"
          : ""
      }`,
    });
    // previewView.prepend(trailDiv)

    this.visited.push([currFile.path, trailDiv]);

    previewView.prepend(trailDiv);

    trailDiv.empty();

    if (sortedTrails.length === 0) {
      trailDiv.innerText = settings.noPathMessage;
      return;
    }

    if (settings.trailOrTable === 1) {
      new TrailPath({
        target: trailDiv,
        props: { sortedTrails, app: this.app, settings, currFile },
      });
    } else if (settings.trailOrTable === 2) {
      new TrailGrid({
        target: trailDiv,
        props: { sortedTrails, app: this.app, plugin: this },
      });
    } else {
      new TrailPath({
        target: trailDiv,
        props: { sortedTrails, app: this.app, settings, currFile },
      });
      new TrailGrid({
        target: trailDiv,
        props: { sortedTrails, app: this.app, plugin: this },
      });
    }
  }

  initView = async (type: string): Promise<void> => {
    let leaf: WorkspaceLeaf = null;
    for (leaf of this.app.workspace.getLeavesOfType(type)) {
      if (leaf.view instanceof MatrixView) {
        return;
      }
      await leaf.setViewState({ type: "empty" });
      break;
    }
    (leaf ?? this.app.workspace.getRightLeaf(false)).setViewState({
      type,
      active: true,
    });
  };

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  onunload(): void {
    console.log("unloading");
    // Detach matrix view
    const openLeaves = this.app.workspace.getLeavesOfType(
      VIEW_TYPE_BREADCRUMBS_MATRIX
    );
    openLeaves.forEach((leaf) => leaf.detach());

    // Empty trailDiv
    this.visited.forEach((visit) => visit[1].remove());
  }
}
