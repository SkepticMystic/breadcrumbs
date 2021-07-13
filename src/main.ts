
import * as graphlib from "graphlib";
import { Graph } from "graphlib";
import { addIcon, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { BreadcrumbsSettingTab } from "src/BreadcrumbsSettingTab";
import {
  DATAVIEW_INDEX_DELAY,
  TRAIL_ICON,
  TRAIL_ICON_SVG,
  VIEW_TYPE_BREADCRUMBS_MATRIX
} from "src/constants";
import type {
  allGraphs,
  BreadcrumbsSettings,
  neighbourObj
} from "src/interfaces";
import MatrixView from "src/MatrixView";
import { closeImpliedLinks, debug, getFileFrontmatterArr, getNeighbourObjArr } from "src/sharedFunctions";
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
  showAll: false,
  noPathMessage: `This note has no real or implied parents`,
  trailSeperator: "→",
  respectReadableLineLength: true,
  debugMode: false,
  superDebugMode: false,
};

export default class BreadcrumbsPlugin extends Plugin {
  settings: BreadcrumbsSettings;
  matrixView: MatrixView;
  visited: [string, HTMLDivElement][];
  refreshIntervalID: number;
  currGraphs: allGraphs;

  async onload(): Promise<void> {
    console.log("loading breadcrumbs plugin");

    await this.loadSettings();

    this.visited = [];

    this.registerView(
      VIEW_TYPE_BREADCRUMBS_MATRIX,
      (leaf: WorkspaceLeaf) => (this.matrixView = new MatrixView(leaf, this))
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
            debug(this.settings, this.currGraphs)

            await this.matrixView.draw();
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
            if (this.matrixView) {
              await this.matrixView.draw();
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
    return this.app.metadataCache.unresolvedLinks[currFile.path][toFile] > 0
      ? "internal-link is-unresolved breadcrumbs-link"
      : "internal-link breadcrumbs-link";
  }

  bfsAllPaths(g: Graph, startNode: string): string[][] {
    const queue: { node: string, path: string[] }[] = [{ node: startNode, path: [] }];
    const pathsArr: string[][] = [];

    let i = 0;
    while (queue.length !== 0 && i < 1000) {
      i++;
      const currPath = queue.shift();

      const newNodes = ((g.successors(currPath.node) ?? []) as string[]);
      const extPath = [currPath.node, ...currPath.path];
      queue.push(...newNodes.map((n: string) => { return { node: n, path: extPath } }));
      // terminal node
      if (newNodes.length === 0) {
        pathsArr.push(extPath);
      }
    }
    pathsArr.forEach(path => {
      if (path.length) { path.splice(path.length - 1, 1) }
    })
    debug(this.settings, { pathsArr })
    return pathsArr;
  }

  dfsAllPaths(g: Graph, startNode: string): string[][] {
    const queue: { node: string; path: string[] }[] = [
      { node: startNode, path: [] },
    ];
    const pathsArr: string[][] = [];

    let i = 0;
    while (queue.length > 0 && i < 1000) {
      i++
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
    return pathsArr
  }

  getBreadcrumbs(g: Graph): string[][] {
    const from = this.app.workspace.getActiveFile().basename;
    const paths = graphlib.alg.dijkstra(g, from);
    const indexNotes: string[] = [this.settings.indexNote].flat();

    const allTrails: string[][] = [];
    let sortedTrails: string[][] = [];

    // No index note chosen
    if (indexNotes[0] === "") {
      const bfsAllPaths = this.bfsAllPaths(g, from);
      if (bfsAllPaths.length > 1) {
        sortedTrails = bfsAllPaths.sort((a, b) => a.length - b.length);
      }
      else {
        sortedTrails = bfsAllPaths;
      }
    } else {
      indexNotes.forEach((index) => {
        let step = index;

        if (paths[step].distance !== Infinity) {
          const breadcrumbs: string[] = [];
          // Walk it until arriving at `from`
          while (paths[step].distance !== 0) {
            breadcrumbs.push(step);
            step = paths[step].predecessor;
          }
          if (breadcrumbs.length > 0) {
            // Add the last step
            breadcrumbs.push(from);
          }
          allTrails.push(breadcrumbs);
        }
      });

      const filteredTrails = allTrails.filter(trail => trail.length > 0)

      sortedTrails = filteredTrails.sort((a, b) =>
        a.length < b.length ? -1 : 1
      );
    }

    debug(this.settings, sortedTrails)
    return sortedTrails;
  }

  async drawTrail(): Promise<void> {
    if (!this.settings.showTrail) { return }

    const currFile = this.app.workspace.getActiveFile();
    const frontm = this.app.metadataCache.getFileCache(currFile)?.frontmatter ?? {};
    if (frontm['kanban-plugin']) { return }

    const { gParents, gChildren } = this.currGraphs;
    const closedParents = closeImpliedLinks(gParents, gChildren)
    const sortedTrails = this.getBreadcrumbs(closedParents);
    const settings = this.settings

    // Get the container div of the active note
    const previewView = document.querySelector(
      "div.mod-active div.view-content div.markdown-preview-view"
    );
    previewView.querySelector('div.breadcrumbs-trail')?.remove()

    const trailDiv = createDiv()
    previewView.prepend(trailDiv)

    this.visited.push([currFile.path, trailDiv])

    trailDiv.className = `breadcrumbs-trail is-readable-line-width${settings.respectReadableLineLength
      ? " markdown-preview-sizer markdown-preview-section"
      : ""
      }`

    previewView.prepend(trailDiv);

    trailDiv.empty();


    if (settings.trailOrTable === 1) {
      new TrailPath({
        target: trailDiv,
        props: { sortedTrails, app: this.app, settings, currFile }
      })
    } else if (settings.trailOrTable === 2) {
      new TrailGrid({
        target: trailDiv,
        props: { sortedTrails, app: this.app, plugin: this }
      })
    } else {
      new TrailPath({
        target: trailDiv,
        props: { sortedTrails, app: this.app, settings, currFile }
      });
      new TrailGrid({
        target: trailDiv,
        props: { sortedTrails, app: this.app, plugin: this }
      })
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
    this.visited.forEach(visit => visit[1].remove())

  }
}
