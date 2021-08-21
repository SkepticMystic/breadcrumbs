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
  debugGroupEnd,
  debugGroupStart,
  getAllGsInDir,
  getDVMetadataCache,
  getNeighbourObjArr,
  getObsMetadataCache,
  mergeGs,
  removeDuplicates,
} from "src/sharedFunctions";
import StatsView from "src/StatsView";
import { VisModal } from "src/VisModal";
import TrailGrid from "./Components/TrailGrid.svelte";
import TrailPath from "./Components/TrailPath.svelte";

const DEFAULT_SETTINGS: BreadcrumbsSettings = {
  userHierarchies: [],
  indexNote: [""],
  hierarchyNotes: [""],
  hierarchyNoteDownFieldName: "",
  hierarchyNoteUpFieldName: "",
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
        this.app.plugins.plugins.dataview
          ? this.app.plugins.plugins.dataview.api
            ? 1
            : this.settings.dvWaitTime
          : 3000
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

  hierarchyNoteAdjList = (str: string) => {
    const settings = this.settings;
    const layers = str.split("\n").filter((line) => line);

    const depth = (line: string) => line.split("-")[0].length;

    const depths = layers.map(depth);
    const differences = [];

    depths.forEach((dep, i) => {
      if (i >= 1) {
        differences.push(dep - depths[i - 1]);
      }
    });

    debug(settings, { differences });

    const posFilteredDifferences = differences
      .filter((diff) => diff !== 0)
      .map(Math.abs);

    const lcm = Math.min(...posFilteredDifferences);

    if (!posFilteredDifferences.every((diff) => diff % lcm === 0)) {
      new Notice(
        "Please make sure the indentation is consistent in your hierarchy note."
      );
      return [];
    }
    const difference = lcm;

    const hier: { note: string; depth: number; children: string[] }[] = [];

    const lineRegex = new RegExp(/\s*- \[\[(.*)\]\]/);

    const pushNoteUp = (
      hier: { note: string; depth: number; children: string[] }[],
      currNote: string,
      currDepth: number
    ) => {
      const copy = [...hier];
      const noteUp = copy.reverse().find((adjItem, i) => {
        return adjItem.depth === currDepth - difference;
      });
      debug(settings, { noteUp });
      if (noteUp) {
        hier[hier.indexOf(noteUp)].children.push(currNote);
      }
    };

    let lineNo = 0;
    while (lineNo < layers.length) {
      const currLine = layers[lineNo];

      const currNote = currLine.match(lineRegex)[1];
      const currDepth = depth(currLine);

      hier[lineNo] = { note: currNote, depth: currDepth, children: [] };

      if (lineNo !== layers.length - 1) {
        const nextLine = layers[lineNo + 1];
        const nextNote = nextLine.match(lineRegex)[1];
        const nextDepth = depth(nextLine);

        if (nextDepth > currDepth) {
          debug(settings, { currNote, nextNote });
          hier[lineNo].children.push(nextNote);
          pushNoteUp(hier, currNote, currDepth);
        } else if (currDepth === 0) {
        } else {
          pushNoteUp(hier, currNote, currDepth);
        }
      } else {
        const prevLine = layers[lineNo - 1];
        const prevDepth = depth(prevLine);

        if (prevDepth >= currDepth) {
          pushNoteUp(hier, currNote, currDepth);
        }
      }

      lineNo++;
    }
    hier.forEach((item) => {
      item.children = removeDuplicates(item.children);
    });
    return hier;
  };

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
    const settings = this.settings;
    debugGroupStart(settings, "debugMode", "Initialise Graphs");
    const files = this.app.vault.getMarkdownFiles();

    const dvQ = !!this.app.plugins.plugins.dataview?.api;

    const fileFrontmatterArr: dvFrontmatterCache[] = dvQ
      ? getDVMetadataCache(this.app, settings, files)
      : getObsMetadataCache(this.app, settings, files);

    const relObjArr = await getNeighbourObjArr(this, fileFrontmatterArr);

    debugGroupStart(settings, "debugMode", "Hierarchy Note Adjacency List");
    let hierarchyNotesArr: {
      note: string;
      depth: number;
      children: string[];
    }[] = [];
    if (settings.hierarchyNotes[0] !== "") {
      const currPath = this.app.workspace.getActiveFile().path;
      const contentArr = [];

      settings.hierarchyNotes.forEach(async (note) => {
        const file = this.app.metadataCache.getFirstLinkpathDest(
          note,
          currPath
        );
        if (file) {
          const content = await this.app.vault.cachedRead(file);
          contentArr.push(content);
        } else {
          new Notice(
            `${note} is no long in your vault. The Hierarchy note should still work, but it is best to remove ${note} from your list of hierarchy notes in Breadcrumbs settings.`
          );
        }
      });

      await Promise.all(contentArr);

      hierarchyNotesArr = contentArr.map(this.hierarchyNoteAdjList).flat();
      debug(settings, { hierarchyNotesArr });
    }
    debugGroupEnd(settings, "debugMode");

    const { userHierarchies } = settings;

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

    if (hierarchyNotesArr.length) {
      const { hierarchyNoteUpFieldName, hierarchyNoteDownFieldName } = settings;

      if (hierarchyNoteUpFieldName !== "") {
        const gUp = graphs.hierGs.find(
          (hierG) => hierG.up[hierarchyNoteUpFieldName]
        ).up[hierarchyNoteUpFieldName];

        hierarchyNotesArr.forEach((adjListItem) => {
          adjListItem.children.forEach((child) => {
            gUp.setEdge(child, adjListItem.note, {
              dir: "up",
              fieldName: hierarchyNoteUpFieldName,
            });
          });
        });
      }
      if (hierarchyNoteDownFieldName !== "") {
        const gDown = graphs.hierGs.find(
          (hierG) => hierG.down[hierarchyNoteDownFieldName]
        ).down[hierarchyNoteDownFieldName];

        hierarchyNotesArr.forEach((adjListItem) => {
          adjListItem.children.forEach((child) => {
            gDown.setEdge(adjListItem.note, child, {
              dir: "down",
              fieldName: hierarchyNoteDownFieldName,
            });
          });
        });
      }
    }

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

    debug(settings, "graphs inited");
    debug(settings, { graphs });

    debugGroupEnd(settings, "debugMode");

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
    const settings = this.settings;
    debugGroupStart(settings, "debugMode", "Draw Trail");
    if (!settings.showTrail) {
      debugGroupEnd(settings, "debugMode");
      return;
    }

    const activeMDView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeMDView) {
      debugGroupEnd(settings, "debugMode");
      return;
    }

    const currFile = activeMDView.file;
    const frontm =
      this.app.metadataCache.getFileCache(currFile)?.frontmatter ?? {};
    if (frontm["kanban-plugin"]) {
      debugGroupEnd(settings, "debugMode");
      return;
    }

    const closedUp = this.currGraphs.closedGs.up;
    const sortedTrails = this.getBreadcrumbs(closedUp, currFile);
    debug(settings, { sortedTrails });

    // Get the container div of the active note
    const previewView = activeMDView.contentEl.querySelector(
      ".markdown-preview-view"
    );
    // Make sure it's empty
    previewView.querySelector("div.breadcrumbs-trail")?.remove();

    if (sortedTrails.length === 0 && settings.noPathMessage === "") {
      debugGroupEnd(settings, "debugMode");
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
      debugGroupEnd(settings, "debugMode");
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
