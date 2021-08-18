import { Graph } from "graphlib";
import {
  addIcon,
  EventRef,
  MarkdownView,
  Notice,
  Plugin,
  TFile,
  WorkspaceLeaf,
} from "obsidian";
import { BreadcrumbsSettingTab } from "src/BreadcrumbsSettingTab";
import {
  DIRECTIONS,
  TRAIL_ICON,
  TRAIL_ICON_SVG,
  VIEW_TYPE_BREADCRUMBS_MATRIX,
  VIEW_TYPE_BREADCRUMBS_STATS,
} from "src/constants";
import type {
  BCIndex,
  BreadcrumbsSettings,
  Directions,
  dvFrontmatterCache,
  HierarchyGraphs,
} from "src/interfaces";
import MatrixView from "src/MatrixView";
import {
  closeImpliedLinks,
  debug,
  getAllGsInDir,
  getDVMetadataCache,
  getNeighbourObjArr,
  getObsMetadataCache,
  mergeGs,
} from "src/sharedFunctions";
import StatsView from "src/StatsView";
import { VisModal } from "src/VisModal";
import TrailGrid from "./Components/TrailGrid.svelte";
import TrailPath from "./Components/TrailPath.svelte";

const DEFAULT_SETTINGS: BreadcrumbsSettings = {
  userHierarchies: [],
  indexNote: [""],
  refreshIndexOnActiveLeafChange: false,
  useAllMetadata: true,
  parseJugglLinksWithoutJuggl: false,
  dvWaitTime: 5000,
  refreshIntervalTime: 0,
  defaultView: true,
  showNameOrType: true,
  showRelationType: true,
  filterImpliedSiblingsOfDifferentTypes: false,
  rlLeaf: true,
  showTrail: true,
  trailOrTable: 3,
  gridDots: false,
  dotsColour: "#000000",
  gridHeatmap: false,
  heatmapColour: getComputedStyle(document.body).getPropertyValue(
    "--text-accent"
  ),
  showAll: false,
  noPathMessage: `This note has no real or implied parents`,
  trailSeperator: "→",
  respectReadableLineLength: true,
  visGraph: "Force Directed Graph",
  visRelation: "Parent",
  visClosed: "Real",
  visAll: "All",
  wikilinkIndex: true,
  aliasesInIndex: false,
  debugMode: false,
  superDebugMode: false,
};

declare module "obsidian" {
  interface App {
    plugins: {
      plugins: {
        dataview: { api: any };
        juggl: any;
      };
    };
  }
}

export default class BreadcrumbsPlugin extends Plugin {
  settings: BreadcrumbsSettings;
  visited: [string, HTMLDivElement][];
  refreshIntervalID: number;
  currGraphs: BCIndex;
  activeLeafChangeEventRef: EventRef;

  async refreshIndex() {
    if (!this.activeLeafChangeEventRef) {
      console.log(
        "activeLeafChangeEventRef wasn't registered onLoad, registering now"
      );
      this.activeLeafChangeEventRef = this.app.workspace.on(
        "active-leaf-change",
        async () => {
          if (this.settings.refreshIndexOnActiveLeafChange) {
            // refreshIndex does everything in one
            await this.refreshIndex();
          } else {
            // If it is not called, active-leaf-change still needs to trigger a redraw
            const activeView = this.getActiveMatrixView();
            if (activeView) {
              await activeView.draw();
            }
            if (this.settings.showTrail) {
              await this.drawTrail();
            }
          }
        }
      );

      this.registerEvent(this.activeLeafChangeEventRef);
    }

    this.currGraphs = await this.initGraphs();
    const activeView = this.getActiveMatrixView();
    if (activeView) {
      await activeView.draw();
    }
    if (this.settings.showTrail) {
      await this.drawTrail();
    }
    new Notice("Index refreshed");
  }

  // this.app.metadataCache.on("dataview:api-ready", console.log("dv ready"));
  async onload(): Promise<void> {
    console.log("loading breadcrumbs plugin");

    await this.loadSettings();

    this.activeLeafChangeEventRef = undefined;
    this.visited = [];

    this.registerView(
      VIEW_TYPE_BREADCRUMBS_STATS,
      (leaf: WorkspaceLeaf) => new StatsView(leaf, this)
    );

    this.registerView(
      VIEW_TYPE_BREADCRUMBS_MATRIX,
      (leaf: WorkspaceLeaf) => new MatrixView(leaf, this)
    );

    const initEverything = async () => {
      this.currGraphs = await this.initGraphs();

      this.initStatsView(VIEW_TYPE_BREADCRUMBS_STATS);
      this.initMatrixView(VIEW_TYPE_BREADCRUMBS_MATRIX);

      if (this.settings.showTrail) {
        await this.drawTrail();
      }

      this.activeLeafChangeEventRef = this.app.workspace.on(
        "active-leaf-change",
        async () => {
          if (this.settings.refreshIndexOnActiveLeafChange) {
            // refreshIndex does everything in one
            await this.refreshIndex();
          } else {
            // If it is not called, active-leaf-change still needs to trigger a redraw
            const activeView = this.getActiveMatrixView();
            if (activeView) {
              await activeView.draw();
            }
            if (this.settings.showTrail) {
              await this.drawTrail();
            }
          }
        }
      );

      this.registerEvent(this.activeLeafChangeEventRef);

      // ANCHOR autorefresh interval
      if (this.settings.refreshIntervalTime > 0) {
        this.refreshIntervalID = window.setInterval(async () => {
          this.currGraphs = await this.initGraphs();
          if (this.settings.showTrail) {
            await this.drawTrail();
          }
          const activeView = this.getActiveMatrixView();
          if (activeView) {
            await activeView.draw();
          }
        }, this.settings.refreshIntervalTime * 1000);
        this.registerInterval(this.refreshIntervalID);
      }
    };

    // let waiting1 = 0;
    // let waiting2 = 0;
    // const waitForDv = async (thenRun: () => any) => {
    //   if (this.app.plugins.plugins.dataview) {
    //     console.log("dv yes");
    //     if (this.app.plugins.plugins.dataview.api) {
    //       console.log("api yes");
    //       setTimeout(async () => await thenRun(), 5000);
    //       this.app.metadataCache.on("dv:api-ready", () =>
    //         console.log("custom dv ready")
    //       );
    //       this.app.metadataCache.trigger("dv:api-ready");
    //     } else {
    //       console.log({ waiting2 });
    //       waiting2++;
    //       if (waiting2 > 300) {
    //         new Notice("Dataview has not loaded yet");
    //         setTimeout(async () => await thenRun(), 5000);
    //       } else {
    //         setTimeout(() => waitForDv(thenRun), 30);
    //       }
    //     }
    //   } else {
    //     console.log({ waiting1 });
    //     waiting1++;
    //     if (waiting1 > 100) {
    //       setTimeout(async () => await thenRun(), 5000);
    //     } else {
    //       setTimeout(() => waitForDv(thenRun), 30);
    //     }
    //   }
    // };

    // waitForDv();

    // if (this.app.plugins.plugins.dataview?.api) {
    //   initEverything();
    // } else {
    //   this.registerEvent(
    //     this.app.metadataCache.on("dataview:api-ready", initEverything)
    //   );
    // }

    this.app.workspace.onLayoutReady(async () => {
      setTimeout(
        async () => {
          await initEverything();
        },
        this.app.plugins.plugins.dataview ? this.settings.dvWaitTime : 3000
      );
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
        this.initMatrixView(VIEW_TYPE_BREADCRUMBS_MATRIX);
      },
    });

    this.addCommand({
      id: "show-breadcrumbs-stats-view",
      name: "Open Stats View",
      checkCallback: (checking: boolean) => {
        if (checking) {
          return (
            this.app.workspace.getLeavesOfType(VIEW_TYPE_BREADCRUMBS_STATS)
              .length === 0
          );
        }
        this.initStatsView(VIEW_TYPE_BREADCRUMBS_STATS);
      },
    });

    this.addCommand({
      id: "Refresh-Breadcrumbs-Index",
      name: "Refresh Breadcrumbs Index",
      callback: async () => await this.refreshIndex(),
    });

    this.addRibbonIcon("dice", "Breadcrumbs Visualisation", () =>
      new VisModal(this.app, this).open()
    );

    this.addSettingTab(new BreadcrumbsSettingTab(this.app, this));
  }

  getActiveMatrixView(): MatrixView | null {
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
    fields: string[],
    dir: Directions,
    fieldName: string
  ): void {
    g.setNode(currFileName, { dir, fieldName });
    if (fieldName === "") return;
    fields.forEach((field) => {
      g.setEdge(currFileName, field, { dir, fieldName });
    });
  }

  async initGraphs(): Promise<BCIndex> {
    debug(this.settings, "initialising graphs");
    const files = this.app.vault.getMarkdownFiles();

    const dvQ = !!this.app.plugins.plugins.dataview?.api;

    const fileFrontmatterArr: dvFrontmatterCache[] = dvQ
      ? getDVMetadataCache(this.app, this.settings, files)
      : getObsMetadataCache(this.app, this.settings, files);

    const relObjArr = await getNeighbourObjArr(this, fileFrontmatterArr);

    const { userHierarchies } = this.settings;

    const graphs: BCIndex = {
      hierGs: [],
      mergedGs: { up: undefined, same: undefined, down: undefined },
      closedGs: { up: undefined, same: undefined, down: undefined },
    };

    userHierarchies.forEach((hier, i) => {
      const newGraphs: HierarchyGraphs = { up: {}, same: {}, down: {} };

      Object.keys(hier).forEach((dir: Directions) => {
        hier[dir].forEach((dirField) => {
          newGraphs[dir][dirField] = new Graph();
        });
      });

      graphs.hierGs.push(newGraphs);
    });

    relObjArr.forEach((relObj) => {
      const currFileName = relObj.current.basename || relObj.current.name;

      relObj.hierarchies.forEach((hier, i) => {
        DIRECTIONS.forEach((dir: Directions) => {
          Object.keys(hier[dir]).forEach((fieldName) => {
            const g = graphs.hierGs[i][dir][fieldName];
            const fieldValues = hier[dir][fieldName];

            this.populateGraph(g, currFileName, fieldValues, dir, fieldName);
          });
        });
      });
    });

    DIRECTIONS.forEach((dir) => {
      const allXGs = getAllGsInDir(userHierarchies, graphs.hierGs, dir);
      const dirMerged = mergeGs(...Object.values(allXGs));
      graphs.mergedGs[dir] = dirMerged;
    });

    DIRECTIONS.forEach((dir) => {
      if (dir !== "same") {
        graphs.closedGs[dir] = closeImpliedLinks(
          graphs.mergedGs[dir],
          graphs.mergedGs[dir === "up" ? "down" : "up"]
        );
      } else {
        graphs.closedGs[dir] = closeImpliedLinks(
          graphs.mergedGs[dir],
          graphs.mergedGs[dir]
        );
      }
    });

    debug(this.settings, "graphs inited");
    debug(this.settings, { graphs });

    return graphs;
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

  getBreadcrumbs(g: Graph, currFile: TFile): string[][] | null {
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

    debug(this.settings, { sortedTrails });
    return sortedTrails;
  }

  async drawTrail(): Promise<void> {
    if (!this.settings.showTrail) return;

    const activeMDView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeMDView) return;

    const currFile = activeMDView.file;
    const frontm =
      this.app.metadataCache.getFileCache(currFile)?.frontmatter ?? {};
    if (frontm["kanban-plugin"]) return;

    const settings = this.settings;

    const closedUp = this.currGraphs.closedGs.up;
    const sortedTrails = this.getBreadcrumbs(closedUp, currFile);
    debug(settings, { sortedTrails });

    // Get the container div of the active note
    const previewView = activeMDView.contentEl.querySelector(
      ".markdown-preview-view"
    );
    // Make sure it's empty
    previewView.querySelector("div.breadcrumbs-trail")?.remove();

    if (sortedTrails.length === 0 && settings.noPathMessage === "") return;

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

  initMatrixView = async (type: string): Promise<void> => {
    let leaf: WorkspaceLeaf = null;
    for (leaf of this.app.workspace.getLeavesOfType(type)) {
      if (leaf.view instanceof MatrixView) {
        return;
      }
      await leaf.setViewState({ type: "empty" });
      break;
    }
    if (this.settings.rlLeaf) {
      (leaf ?? this.app.workspace.getRightLeaf(false)).setViewState({
        type,
        active: false,
      });
    } else {
      (leaf ?? this.app.workspace.getLeftLeaf(false)).setViewState({
        type,
        active: false,
      });
    }
  };

  initStatsView = async (type: string): Promise<void> => {
    let leaf: WorkspaceLeaf = null;
    for (leaf of this.app.workspace.getLeavesOfType(type)) {
      if (leaf.view instanceof StatsView) {
        return;
      }
      await leaf.setViewState({ type: "empty" });
      break;
    }
    (leaf ?? this.app.workspace.getRightLeaf(false)).setViewState({
      type,
      active: false,
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
    const openLeaves = [
      VIEW_TYPE_BREADCRUMBS_MATRIX,
      VIEW_TYPE_BREADCRUMBS_STATS,
    ]
      .map((type) => this.app.workspace.getLeavesOfType(type))
      .flat(1);

    openLeaves.forEach((leaf) => leaf.detach());

    // Empty trailDiv
    this.visited.forEach((visit) => visit[1].remove());
  }
}
