import Graph, { MultiGraph } from "graphology";
import {
  addIcon,
  EventRef,
  MarkdownView,
  normalizePath,
  Notice,
  Plugin,
  TFile,
  WorkspaceLeaf,
} from "obsidian";
import { openView, wait } from "obsidian-community-lib/dist/utils";
import { BCSettingTab } from "src/BreadcrumbsSettingTab";
import {
  blankDirObjs,
  blankDirUndef,
  DEFAULT_SETTINGS,
  DIRECTIONS,
  MATRIX_VIEW,
  STATS_VIEW,
  TRAIL_ICON,
  TRAIL_ICON_SVG,
} from "src/constants";
import type {
  BCIndex,
  BCSettings,
  Directions,
  dvFrontmatterCache,
  HierarchyGraphs,
} from "src/interfaces";
import MatrixView from "src/MatrixView";
import {
  addEdgeIfNot,
  addNodeIfNot,
  closeImpliedLinks,
  debug,
  debugGroupEnd,
  debugGroupStart,
  getAllFieldGs,
  getAllGsInDir,
  getDVMetadataCache,
  getNeighbourObjArr,
  getObsMetadataCache,
  getOppDir,
  getOutNeighbours,
  getPrevNext,
  iterateAllGs,
  mergeGs,
  oppFields,
  removeDuplicates,
  writeBCToFile,
} from "src/sharedFunctions";
import StatsView from "src/StatsView";
import { VisModal } from "src/VisModal";
import NextPrev from "./Components/NextPrev.svelte";
import TrailGrid from "./Components/TrailGrid.svelte";
import TrailPath from "./Components/TrailPath.svelte";

export default class BCPlugin extends Plugin {
  settings: BCSettings;
  visited: [string, HTMLDivElement][] = [];
  refreshIntervalID: number;
  currGraphs: BCIndex;
  activeLeafChange: EventRef = undefined;
  statusBatItemEl: HTMLElement = undefined;

  async refreshIndex() {
    if (!this.activeLeafChange) this.registerActiveLeafEvent();

    this.currGraphs = await this.initGraphs();
    const activeView = this.getActiveMatrixView();

    if (activeView) await activeView.draw();
    if (this.settings.showTrail) await this.drawTrail();

    new Notice("Index refreshed");
  }

  registerActiveLeafEvent() {
    this.activeLeafChange = this.app.workspace.on(
      "active-leaf-change",
      async () => {
        if (this.settings.refreshIndexOnActiveLeafChange) {
          await this.refreshIndex();
        } else {
          const activeView = this.getActiveMatrixView();
          if (activeView) await activeView.draw();
          if (this.settings.showBCs) await this.drawTrail();
        }
      }
    );
    this.registerEvent(this.activeLeafChange);
  }

  initEverything = async () => {
    const { settings } = this;
    this.currGraphs = await this.initGraphs();

    await openView(this.app, MATRIX_VIEW, MatrixView);
    await openView(this.app, STATS_VIEW, StatsView);

    if (settings.showBCs) await this.drawTrail();

    this.registerActiveLeafEvent();

    // ANCHOR autorefresh interval
    if (settings.refreshIntervalTime > 0) {
      this.refreshIntervalID = window.setInterval(async () => {
        this.currGraphs = await this.initGraphs();
        if (settings.showBCs) await this.drawTrail();

        const activeView = this.getActiveMatrixView();
        if (activeView) await activeView.draw();
      }, settings.refreshIntervalTime * 1000);
      this.registerInterval(this.refreshIntervalID);
    }
  };

  async onload(): Promise<void> {
    console.log("loading breadcrumbs plugin");

    await this.loadSettings();
    ["prev", "next"].forEach((dir) => {
      this.settings.userHierarchies.forEach(async (hier, i) => {
        if (hier[dir] === undefined) this.settings.userHierarchies[i][dir] = [];
        await this.saveSettings();
      });
    });

    this.registerView(
      STATS_VIEW,
      (leaf: WorkspaceLeaf) => new StatsView(leaf, this)
    );
    this.registerView(
      MATRIX_VIEW,
      (leaf: WorkspaceLeaf) => new MatrixView(leaf, this)
    );

    this.app.workspace.onLayoutReady(async () => {
      if (this.app.plugins.enabledPlugins.has("dataview")) {
        const api = this.app.plugins.plugins.dataview?.api;
        if (api) {
          await this.initEverything();
        } else {
          this.registerEvent(
            this.app.metadataCache.on("dataview:api-ready", async () => {
              await this.initEverything();
            })
          );
        }
      }
    });

    addIcon(TRAIL_ICON, TRAIL_ICON_SVG);

    this.addCommand({
      id: "show-breadcrumbs-matrix-view",
      name: "Open Matrix View",
      //@ts-ignore
      checkCallback: async (checking: boolean) => {
        if (checking) {
          return this.app.workspace.getLeavesOfType(MATRIX_VIEW).length === 0;
        }
        await openView(this.app, MATRIX_VIEW, MatrixView);
      },
    });

    this.addCommand({
      id: "show-breadcrumbs-stats-view",
      name: "Open Stats View",
      //@ts-ignore
      checkCallback: async (checking: boolean) => {
        if (checking) {
          return this.app.workspace.getLeavesOfType(STATS_VIEW).length === 0;
        }
        await openView(this.app, STATS_VIEW, StatsView);
      },
    });

    this.addCommand({
      id: "Refresh-Breadcrumbs-Index",
      name: "Refresh Breadcrumbs Index",
      callback: async () => await this.refreshIndex(),
    });

    this.addCommand({
      id: "Write-Breadcrumbs-to-Current-File",
      name: "Write Breadcrumbs to Current File",
      callback: async () => {
        const currFile = this.app.workspace.getActiveFile();
        await writeBCToFile(
          this.app,
          this,
          this.currGraphs,
          currFile,
          this.settings.writeBCsInline
        );
      },
    });

    this.addCommand({
      id: "Write-Breadcrumbs-to-All-Files",
      name: "Write Breadcrumbs to **ALL** Files",
      callback: () => {
        const first = window.confirm(
          "This action will write the implied Breadcrumbs of each file to that file.\nIt uses the MetaEdit plugins API to update the YAML, so it should only affect that frontmatter of your note.\nI can't promise that nothing bad will happen. **This operation cannot be undone**."
        );
        if (first) {
          const second = window.confirm(
            "Are you sure? You have been warned that this operation will attempt to update all files with implied breadcrumbs."
          );
          if (second) {
            const third = window.confirm(
              "For real, please make a back up before"
            );
            if (third) {
              try {
                this.app.vault
                  .getMarkdownFiles()
                  .forEach(
                    async (file) =>
                      await writeBCToFile(
                        this.app,
                        this,
                        this.currGraphs,
                        file,
                        this.settings.writeBCsInline
                      )
                  );
                new Notice("Operation Complete");
              } catch (error) {
                new Notice(error);
                console.log(error);
              }
            }
          }
        }
      },
      checkCallback: () => this.settings.showWriteAllBCsCmd,
    });

    // TODO get a better icon for this
    this.addRibbonIcon("dice", "Breadcrumbs Visualisation", () =>
      new VisModal(this.app, this).open()
    );

    this.statusBatItemEl = this.addStatusBarItem();

    this.addSettingTab(new BCSettingTab(this.app, this));
  }

  getActiveMatrixView(): MatrixView | null {
    const leaves = this.app.workspace.getLeavesOfType(MATRIX_VIEW);
    if (leaves && leaves.length >= 1) {
      const view = leaves[0].view;
      if (view instanceof MatrixView) {
        return view;
      }
    }
    return null;
  }

  hierarchyNoteAdjList = (str: string) => {
    let noteContent = str;
    const { settings } = this;

    const yamlRegex = new RegExp(/^---.*/);
    const hasYaml = yamlRegex.test(noteContent);
    if (hasYaml) {
      noteContent = noteContent.split("---").slice(2).join("---");
    }

    const layers = noteContent.split("\n").filter((line) => line);

    const getDepth = (line: string) => line.split(/[-*+]/)[0].length;

    const depths = layers.map(getDepth);
    const differences = [];

    depths.forEach((dep, i) => {
      if (i >= 1) {
        differences.push(dep - depths[i - 1]);
      }
    });

    debug(settings, { differences });

    const posDifferences = differences
      .filter((diff) => diff !== 0)
      .map(Math.abs);

    const lcm = Math.min(...posDifferences);

    if (!posDifferences.every((diff) => diff % lcm === 0)) {
      new Notice(
        "Please make sure the indentation is consistent in your hierarchy note."
      );
      return [];
    }
    const difference = lcm;

    type adjItem = { note: string; depth: number; children: string[] };
    const adjItems: adjItem[] = [];

    // TODO Allow user to pick the field name they want
    const lineRegex = new RegExp(/\s*[-*+] \[\[(.*)\]\]/);

    const pushNoteUp = (
      hier: adjItem[],
      currNote: string,
      currDepth: number
    ) => {
      const copy = [...hier];
      const noteUp = copy
        .reverse()
        .findIndex((adjItem) => adjItem.depth === currDepth - difference);
      if (noteUp > -1) hier[noteUp].children.push(currNote);
    };

    let lineNo = 0;
    while (lineNo < layers.length) {
      const currLine = layers[lineNo];

      const currNote = currLine.match(lineRegex)[1];
      const currDepth = getDepth(currLine);

      adjItems[lineNo] = { note: currNote, depth: currDepth, children: [] };

      if (lineNo !== layers.length - 1) {
        const nextLine = layers[lineNo + 1];
        const nextNote = nextLine.match(lineRegex)[1];
        const nextDepth = getDepth(nextLine);

        if (nextDepth > currDepth) {
          adjItems[lineNo].children.push(nextNote);
          pushNoteUp(adjItems, currNote, currDepth);
        } else if (currDepth === 0) return;
        else {
          pushNoteUp(adjItems, currNote, currDepth);
        }
      } else {
        const prevLine = layers[lineNo - 1];
        const prevDepth = getDepth(prevLine);

        if (prevDepth >= currDepth) {
          pushNoteUp(adjItems, currNote, currDepth);
        }
      }

      lineNo++;
    }
    adjItems.forEach((item) => {
      item.children = removeDuplicates(item.children);
    });
    return adjItems;
  };

  // SECTION OneSource

  populateGraph(
    g: Graph,
    currFileName: string,
    fieldValues: string[],
    dir: Directions,
    fieldName: string
  ): void {
    addNodeIfNot(g, currFileName, { dir, fieldName });

    if (fieldName === "") return;
    fieldValues.forEach((value) => {
      addNodeIfNot(g, value, { dir, fieldName });
      addEdgeIfNot(g, currFileName, value, { dir, fieldName });
    });
  }

  async getCSVRows() {
    const { CSVPaths } = this.settings;
    const CSVRows: { [key: string]: string }[] = [];
    if (CSVPaths === "") return CSVRows;

    const fullPath = normalizePath(CSVPaths);

    const content = await this.app.vault.adapter.read(fullPath);
    const lines = content.split("\n");

    const headers = lines[0].split(",").map((head) => head.trim());
    lines.slice(1).forEach((row) => {
      const rowObj = {};
      row
        .split(",")
        .map((head) => head.trim())
        .forEach((item, i) => {
          rowObj[headers[i]] = item;
        });
      CSVRows.push(rowObj);
    });

    console.log({ CSVRows });
    return CSVRows;
  }

  addCSVCrumbs(
    g: Graph,
    CSVRows: { [key: string]: string }[],
    dir: Directions,
    fieldName: string
  ) {
    CSVRows.forEach((row) => {
      addNodeIfNot(g, row.file);
      if (fieldName === "" || !row[fieldName]) return;

      addNodeIfNot(g, row[fieldName]);
      addEdgeIfNot(g, row.file, row[fieldName], { dir, fieldName });
    });
  }

  async initGraphs(): Promise<BCIndex> {
    const { settings } = this;
    debugGroupStart(settings, "debugMode", "Initialise Graphs");
    const files = this.app.vault.getMarkdownFiles();

    const dvQ = !!this.app.plugins.enabledPlugins.has("dataview");

    let fileFrontmatterArr: dvFrontmatterCache[] = dvQ
      ? getDVMetadataCache(this.app, settings, files)
      : getObsMetadataCache(this.app, settings, files);

    if (fileFrontmatterArr[0] === undefined) {
      await wait(1000);
      fileFrontmatterArr = dvQ
        ? getDVMetadataCache(this.app, settings, files)
        : getObsMetadataCache(this.app, settings, files);
    }

    const neighbourObjArr = await getNeighbourObjArr(this, fileFrontmatterArr);

    debugGroupStart(settings, "debugMode", "Hierarchy Note Adjacency List");
    let hierarchyNotesArr: {
      note: string;
      depth: number;
      children: string[];
    }[] = [];
    if (settings.hierarchyNotes[0] !== "") {
      const contentArr: string[] = [];

      settings.hierarchyNotes.forEach(async (note) => {
        const file = this.app.metadataCache.getFirstLinkpathDest(note, "");
        if (file) {
          const content = await this.app.vault.cachedRead(file);
          contentArr.push(content);
        } else {
          new Notice(
            `${note} is no longer in your vault. The Hierarchy note should still work, but it is best to remove ${note} from your list of hierarchy notes in Breadcrumbs settings.`
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
      main: new MultiGraph(),
      hierGs: [],
      mergedGs: blankDirUndef(),
      closedGs: blankDirUndef(),
      limitTrailG: undefined,
    };

    userHierarchies.forEach((hier) => {
      const newGraphs: HierarchyGraphs = blankDirObjs();

      DIRECTIONS.forEach((dir: Directions) => {
        if (hier[dir] === undefined) {
          hier[dir] = [];
        }
        hier[dir].forEach((dirField) => {
          newGraphs[dir][dirField] = new Graph();
        });
      });
      graphs.hierGs.push(newGraphs);
    });

    const useCSV = settings.CSVPaths !== "";
    const CSVRows = useCSV ? await this.getCSVRows() : [];

    neighbourObjArr.forEach((neighbours) => {
      const currFileName =
        neighbours.current.basename || neighbours.current.name;
      neighbours.hierarchies.forEach((hier, i) => {
        DIRECTIONS.forEach((dir) => {
          for (const fieldName in hier[dir]) {
            const g = graphs.hierGs[i][dir][fieldName];
            const targets = hier[dir][fieldName];

            this.populateGraph(g, currFileName, targets, dir, fieldName);
            addNodeIfNot(graphs.main, currFileName, {
              dir,
              fieldName,
              order: neighbours.order,
            });
            targets.forEach((target) => {
              addNodeIfNot(graphs.main, target, {
                dir,
                fieldName,
                order:
                  neighbourObjArr.find(
                    (neighbour) =>
                      (neighbour.current.basename || neighbour.current.name) ===
                      target
                  )?.order ?? 9999,
              });
              addEdgeIfNot(graphs.main, currFileName, target, {
                dir,
                fieldName,
              });
            });

            if (useCSV) {
              this.addCSVCrumbs(g, CSVRows, dir, fieldName);
              this.addCSVCrumbs(graphs.main, CSVRows, dir, fieldName);
            }
          }
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
            addNodeIfNot(gUp, adjListItem.note, { dir: "up" });
            gUp.addEdge(child, adjListItem.note, {
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
            addNodeIfNot(gDown, adjListItem.note, { dir: "down" });
            gDown.addEdge(adjListItem.note, child, {
              dir: "down",
              fieldName: hierarchyNoteDownFieldName,
            });
          });
        });
      }
    }

    DIRECTIONS.forEach((dir) => {
      const allXGs = getAllGsInDir(graphs.hierGs, dir);
      const dirMerged = mergeGs(...Object.values(allXGs));
      graphs.mergedGs[dir] = dirMerged;
    });

    DIRECTIONS.forEach((dir) => {
      graphs.closedGs[dir] = closeImpliedLinks(
        graphs.mergedGs[dir],
        graphs.mergedGs[getOppDir(dir)]
      );
    });

    // LimitTrailG
    if (Object.values(settings.limitTrailCheckboxStates).every((val) => val)) {
      graphs.limitTrailG = graphs.closedGs.up;
    } else {
      const allUps = getAllGsInDir(graphs.hierGs, "up");
      const allLimitedTrailsGsKeys: string[] = Object.keys(allUps).filter(
        (field) => settings.limitTrailCheckboxStates[field]
      );
      const allLimitedTrailsGs: Graph[] = [];
      allLimitedTrailsGsKeys.forEach((key) =>
        allLimitedTrailsGs.push(allUps[key])
      );

      const mergedLimitedUpGs = mergeGs(...allLimitedTrailsGs);

      const allLimitedDownGs: Graph[] = [];

      Object.keys(settings.limitTrailCheckboxStates).forEach((limitedField) => {
        const oppFieldsArr = oppFields(limitedField, "up", userHierarchies);
        const oppGs = getAllFieldGs(oppFieldsArr, graphs.hierGs);
        allLimitedDownGs.push(...oppGs);
      });

      const mergedLimitedDownGs = mergeGs(...allLimitedDownGs);
      graphs.limitTrailG = closeImpliedLinks(
        mergedLimitedUpGs,
        mergedLimitedDownGs
      );
    }

    debug(settings, "graphs inited");
    debug(settings, { graphs });

    debugGroupEnd(settings, "debugMode");

    return graphs;
  }

  // !SECTION OneSource

  // SECTION Breadcrumbs

  bfsAllPaths(g: Graph, startNode: string): string[][] {
    const pathsArr: string[][] = [];
    const queue: { node: string; path: string[] }[] = [
      { node: startNode, path: [] },
    ];

    let i = 0;
    while (queue.length !== 0 && i < 1000) {
      i++;
      const { node, path } = queue.shift();
      const extPath = [node, ...path];
      queue.push(
        ...getOutNeighbours(g, node).map((n) => {
          return { node: n, path: extPath };
        })
      );
      // terminal node
      if (!g.hasNode(node) || !g.outDegree(node)) {
        pathsArr.push(extPath);
      }
    }
    // Splice off the current note from the path
    pathsArr.forEach((path) => {
      if (path.length) path.splice(path.length - 1, 1);
    });
    debug(this.settings, { pathsArr });
    return pathsArr;
  }

  getBreadcrumbs(g: Graph, currFile: TFile): string[][] | null {
    if (currFile.extension !== "md") return null;

    const from = currFile.basename;
    const indexNotes: string[] = [this.settings.indexNote].flat();

    let allTrails: string[][] = this.bfsAllPaths(g, from);

    // No index note chosen
    if (indexNotes[0] !== "" && allTrails[0].length > 0) {
      allTrails = allTrails.filter((trail) => indexNotes.includes(trail[0]));
    }
    const sortedTrails = allTrails
      .filter((trail) => trail.length > 0)
      .sort((a, b) => a.length - b.length);

    debug(this.settings, { sortedTrails });
    return sortedTrails;
  }

  async drawTrail(): Promise<void> {
    const { settings } = this;
    debugGroupStart(settings, "debugMode", "Draw Trail");
    if (!settings.showBCs) {
      debugGroupEnd(settings, "debugMode");
      return;
    }
    const activeMDView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeMDView) {
      debugGroupEnd(settings, "debugMode");
      return;
    }
    const currFile = activeMDView.file;
    const currMetadata = this.app.metadataCache.getFileCache(currFile);

    const previewView = activeMDView.contentEl.querySelector(
      ".markdown-preview-view"
    );
    previewView.querySelector("div.BC-trail")?.remove();
    if (currMetadata.frontmatter?.hasOwnProperty(settings.hideTrailFieldName)) {
      debugGroupEnd(settings, "debugMode");
      return;
    }

    const frontm =
      this.app.metadataCache.getFileCache(currFile)?.frontmatter ?? {};
    if (frontm["kanban-plugin"]) {
      debugGroupEnd(settings, "debugMode");
      return;
    }

    const closedUp = this.currGraphs.limitTrailG;
    const sortedTrails = this.getBreadcrumbs(closedUp, currFile);
    debug(settings, { sortedTrails });

    const { basename } = currFile;

    const { rPrev, rNext, iPrev, iNext } = getPrevNext(this, basename);
    // Remove duplicate implied
    const next = [...rNext];
    iNext.forEach((i) => {
      if (next.findIndex((n) => n.to === i.to) === -1) {
        next.push(i);
      }
    });
    const prev = [...rPrev];
    iPrev.forEach((i) => {
      if (prev.findIndex((n) => n.to === i.to) === -1) {
        prev.push(i);
      }
    });

    const noItems =
      sortedTrails.length === 0 && next.length === 0 && prev.length === 0;

    if (noItems && settings.noPathMessage === "") {
      debugGroupEnd(settings, "debugMode");
      return;
    }

    const trailDiv = createDiv({
      cls: `BC-trail ${
        settings.respectReadableLineLength
          ? "is-readable-line-width markdown-preview-sizer markdown-preview-section"
          : ""
      }`,
    });

    this.visited.push([currFile.path, trailDiv]);

    previewView.querySelector(".markdown-preview-sizer").before(trailDiv);

    trailDiv.empty();

    if (noItems) {
      trailDiv.innerText = settings.noPathMessage;
      debugGroupEnd(settings, "debugMode");
      return;
    }

    const props = { sortedTrails, app: this.app, plugin: this };

    if (settings.showTrail && sortedTrails.length) {
      new TrailPath({
        target: trailDiv,
        props,
      });
    }
    if (settings.showGrid && sortedTrails.length) {
      new TrailGrid({
        target: trailDiv,
        props,
      });
    }
    if (settings.showPrevNext && (next.length || prev.length)) {
      new NextPrev({
        target: trailDiv,
        props: { app: this.app, plugin: this, next, prev },
      });
    }
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  onunload(): void {
    console.log("unloading");
    [MATRIX_VIEW, STATS_VIEW].forEach((type) =>
      this.app.workspace.detachLeavesOfType(type)
    );

    // Empty trailDiv
    this.visited.forEach((visit) => visit[1].remove());
  }
}
