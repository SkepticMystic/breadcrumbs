import Graph, { MultiGraph } from "graphology";
import { dfsFromNode } from "graphology-traversal";
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
import {
  addFeatherIcon,
  openView,
  wait,
} from "obsidian-community-lib/dist/utils";
import { BCSettingTab } from "src/BreadcrumbsSettingTab";
import {
  DEFAULT_SETTINGS,
  DIRECTIONS,
  MATRIX_VIEW,
  TRAIL_ICON,
  TRAIL_ICON_SVG,
  VIEWS,
} from "src/constants";
import type {
  BCSettings,
  Directions,
  dvFrontmatterCache,
  HierarchyNoteItem,
  MyView,
  neighbourObj,
} from "src/interfaces";
import {
  addEdgeIfNot,
  addNodesIfNot,
  debug,
  debugGroupEnd,
  debugGroupStart,
  getDVMetadataCache,
  getFields,
  getNeighbourObjArr,
  getObsMetadataCache,
  getOppFields,
  getRealnImplied,
  getReflexiveClosure,
  getSubForFields,
  getSubInDirs,
  writeBCToFile,
} from "src/sharedFunctions";
import { VisModal } from "src/VisModal";
import NextPrev from "./Components/NextPrev.svelte";
import TrailGrid from "./Components/TrailGrid.svelte";
import TrailPath from "./Components/TrailPath.svelte";

export default class BCPlugin extends Plugin {
  settings: BCSettings;
  visited: [string, HTMLDivElement][] = [];
  refreshIntervalID: number;
  mainG: MultiGraph;
  activeLeafChange: EventRef = undefined;
  statusBatItemEl: HTMLElement = undefined;

  async refreshIndex() {
    if (!this.activeLeafChange) this.registerActiveLeafEvent();

    this.mainG = await this.initGraphs();

    for (const view of VIEWS) {
      await this.getActiveTYPEView(view.type)?.draw();
    }

    if (this.settings.showTrail) await this.drawTrail();

    new Notice("Index refreshed");
  }

  registerActiveLeafEvent() {
    this.activeLeafChange = this.app.workspace.on(
      "active-leaf-change",
      async () => {
        if (this.settings.refreshOnNoteChange) {
          await this.refreshIndex();
        } else {
          const activeView = this.getActiveTYPEView(MATRIX_VIEW);
          if (activeView) await activeView.draw();
          if (this.settings.showBCs) await this.drawTrail();
        }
      }
    );
    this.registerEvent(this.activeLeafChange);
  }

  initEverything = async () => {
    const { settings } = this;
    this.mainG = await this.initGraphs();

    for (const view of VIEWS) {
      if (view.openOnLoad)
        await openView(this.app, view.type, view.constructor);
    }

    if (settings.showBCs) await this.drawTrail();

    this.registerActiveLeafEvent();

    // if (settings.refreshIntervalTime > 0) {
    //   this.refreshIntervalID = window.setInterval(async () => {
    //     this.mainG = await this.initGraphs();
    //     if (settings.showBCs) await this.drawTrail();

    //     const activeView = this.getActiveTYPEView(MATRIX_VIEW);
    //     if (activeView) await activeView.draw();
    //   }, settings.refreshIntervalTime * 1000);
    //   this.registerInterval(this.refreshIntervalID);
    // }
  };

  async onload(): Promise<void> {
    console.log("loading breadcrumbs plugin");

    await this.loadSettings();

    // Prevent breaking change
    ["prev", "next"].forEach((dir) => {
      this.settings.userHiers.forEach(async (hier, i) => {
        if (hier[dir] === undefined) this.settings.userHiers[i][dir] = [];
        await this.saveSettings();
      });
    });
    const upFields = getFields(this.settings.userHiers, "up");
    for (const field in this.settings.limitTrailCheckboxStates) {
      if (!upFields.includes(field)) {
        delete this.settings.limitTrailCheckboxStates[field];
      }
    }

    for (const view of VIEWS) {
      this.registerView(
        view.type,
        (leaf: WorkspaceLeaf) => new view.constructor(leaf, this)
      );
    }

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

    for (const view of VIEWS) {
      this.addCommand({
        id: `show-${view.type}-view`,
        name: `Open ${view.plain} View`,
        //@ts-ignore
        checkCallback: async (checking: boolean) => {
          if (checking) {
            return this.app.workspace.getLeavesOfType(view.type).length === 0;
          }
          await openView(this.app, view.type, view.constructor);
        },
      });
    }

    this.addCommand({
      id: "open-vis-modal",
      name: "Open Visualisation Modal",
      callback: () => {
        new VisModal(this.app, this).open();
      },
    });

    this.addCommand({
      id: "Refresh-Breadcrumbs-Index",
      name: "Refresh Breadcrumbs Index",
      callback: async () => await this.refreshIndex(),
    });
    // this.addCommand({
    //   id: "test-traversal",
    //   name: "Traverse",
    //   hotkeys: [{ key: "a", modifiers: ["Alt"] }],
    //   callback: () => {
    //     const { basename } = this.app.workspace.getActiveFile();
    //     const g = getSubInDirs(this.mainG, "up", "down");
    //     const closed = getReflexiveClosure(g, this.settings.userHiers);
    //     const onlyUps = getSubInDirs(closed, "up");

    //     this.getdfsFromNode(onlyUps, basename);
    //   },
    // });

    this.addCommand({
      id: "Write-Breadcrumbs-to-Current-File",
      name: "Write Breadcrumbs to Current File",
      callback: async () => {
        const currFile = this.app.workspace.getActiveFile();
        await writeBCToFile(
          this.app,
          this,
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

    this.addRibbonIcon(
      addFeatherIcon("tv") as string,
      "Breadcrumbs Visualisation",
      () => new VisModal(this.app, this).open()
    );

    this.statusBatItemEl = this.addStatusBarItem();

    this.addSettingTab(new BCSettingTab(this.app, this));
  }

  getActiveTYPEView(type: string): MyView | null {
    const { constructor } = VIEWS.find((view) => view.type === type);
    const leaves = this.app.workspace.getLeavesOfType(type);
    if (leaves && leaves.length >= 1) {
      const view = leaves[0].view;
      if (view instanceof constructor) {
        return view;
      }
    }
    return null;
  }

  async getHierarchyNoteItems(file: TFile) {
    const { userHiers } = this.settings;
    const { listItems } = this.app.metadataCache.getFileCache(file);
    if (!listItems) return [];

    const lines = (await this.app.vault.cachedRead(file)).split("\n");

    const hierarchyNoteItems: HierarchyNoteItem[] = [];

    const afterBulletReg = new RegExp(/\s*[+*-]\s(.*$)/);
    const dropWikiLinksReg = new RegExp(/\[\[(.*?)\]\]/);
    const fieldReg = new RegExp(/(.*?)\[\[.*?\]\]/);

    const problemFields: string[] = [];

    const upFields = getFields(userHiers, "up");
    for (const item of listItems) {
      const currItem = lines[item.position.start.line];

      const afterBulletCurr = afterBulletReg.exec(currItem)[1];
      const dropWikiCurr = dropWikiLinksReg.exec(afterBulletCurr)[1];
      let fieldCurr = fieldReg.exec(afterBulletCurr)[1].trim() || null;

      // Ensure fieldName is one of the existing up fields. `null` if not
      if (!upFields.includes(fieldCurr)) {
        problemFields.push(fieldCurr);
        fieldCurr = null;
      }

      const { parent } = item;
      if (parent >= 0) {
        const parentNote = lines[parent];
        const afterBulletParent = afterBulletReg.exec(parentNote)[1];
        const dropWikiParent = dropWikiLinksReg.exec(afterBulletParent)[1];

        hierarchyNoteItems.push({
          currNote: dropWikiCurr,
          parentNote: dropWikiParent,
          field: fieldCurr,
        });
      } else {
        hierarchyNoteItems.push({
          currNote: dropWikiCurr,
          parentNote: null,
          field: fieldCurr,
        });
      }
    }
    if (problemFields.length > 0) {
      const msg = `'${problemFields.join(
        ", "
      )}' is/are not a field in any of your hierarchies, but is/are being used in: '${
        file.basename
      }'`;
      new Notice(msg);
      console.log(msg, { problemFields });
    }
    return hierarchyNoteItems;
  }

  // SECTION OneSource

  populateMain(
    main: MultiGraph,
    basename: string,
    dir: Directions,
    field: string,
    targets: string[],
    neighbour: neighbourObj,
    neighbourObjArr: neighbourObj[]
  ): void {
    addNodesIfNot(main, [basename], {
      dir,
      field,
      //@ts-ignore
      order: neighbour.order,
    });
    targets.forEach((target) => {
      addNodesIfNot(main, [target], {
        dir,
        field,
        //@ts-ignore
        order:
          neighbourObjArr.find(
            (neighbour) =>
              (neighbour.current.basename || neighbour.current.name) === target
          )?.order ?? 9999,
      });
      addEdgeIfNot(main, basename, target, {
        //@ts-ignore
        dir,
        field,
      });
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
    field: string
  ) {
    CSVRows.forEach((row) => {
      //@ts-ignore
      addNodesIfNot(g, [row.file], { dir, field });
      if (field === "" || !row[field]) return;

      addNodesIfNot(g, [row[field]], { dir, field });
      //@ts-ignore
      addEdgeIfNot(g, row.file, row[field], { dir, field });
    });
  }

  async initGraphs(): Promise<MultiGraph> {
    const { settings, app } = this;
    debugGroupStart(settings, "debugMode", "Initialise Graphs");
    const files = app.vault.getMarkdownFiles();
    const dvQ = !!app.plugins.enabledPlugins.has("dataview");

    let fileFrontmatterArr: dvFrontmatterCache[] = dvQ
      ? getDVMetadataCache(app, settings, files)
      : getObsMetadataCache(app, settings, files);

    if (fileFrontmatterArr[0] === undefined) {
      await wait(1000);
      fileFrontmatterArr = dvQ
        ? getDVMetadataCache(app, settings, files)
        : getObsMetadataCache(app, settings, files);
    }

    const neighbourObjArr = await getNeighbourObjArr(this, fileFrontmatterArr);

    debugGroupStart(settings, "debugMode", "Hierarchy Note Adjacency List");
    const hierarchyNotesArr: HierarchyNoteItem[] = [];
    if (settings.hierarchyNotes[0] !== "") {
      for (const note of settings.hierarchyNotes) {
        const file = app.metadataCache.getFirstLinkpathDest(note, "");
        if (file) {
          hierarchyNotesArr.push(...(await this.getHierarchyNoteItems(file)));
        } else {
          new Notice(
            `${note} is no longer in your vault. It is best to remove it in Breadcrumbs settings.`
          );
        }
      }
    }
    debugGroupEnd(settings, "debugMode");

    const { userHiers } = settings;
    const mainG = new MultiGraph();

    const useCSV = settings.CSVPaths !== "";
    const CSVRows = useCSV ? await this.getCSVRows() : [];

    neighbourObjArr.forEach((neighbours) => {
      const currFileName =
        neighbours.current.basename || neighbours.current.name;

      for (const hier of neighbours.hierarchies) {
        for (const dir of DIRECTIONS) {
          for (const field in hier[dir]) {
            const targets = hier[dir][field];

            this.populateMain(
              mainG,
              currFileName,
              dir,
              field,
              targets,
              neighbours,
              neighbourObjArr
            );

            if (useCSV) this.addCSVCrumbs(mainG, CSVRows, dir, field);
          }
        }
      }
    });

    if (hierarchyNotesArr.length) {
      const { HNUpField } = settings;
      const upFields = getFields(userHiers, "up");

      hierarchyNotesArr.forEach((hnItem) => {
        if (hnItem.parentNote === null) return;

        const upField = hnItem.field ?? (HNUpField || upFields[0]);
        const downField =
          getOppFields(userHiers, upField)[0] ?? `${upField}<down>`;

        const aUp = {
          dir: "up",
          field: upField,
        };
        //@ts-ignore
        addNodesIfNot(mainG, [hnItem.currNote, hnItem.parentNote], aUp);
        //@ts-ignore
        addEdgeIfNot(mainG, hnItem.currNote, hnItem.parentNote, aUp);

        const aDown = {
          dir: "down",
          field: downField,
        };
        //@ts-ignore
        addNodesIfNot(mainG, [hnItem.parentNote, hnItem.currNote], aDown);
        //@ts-ignore
        addEdgeIfNot(mainG, hnItem.parentNote, hnItem.currNote, aDown);
      });
    }

    debug(settings, "graphs inited");
    debug(settings, { mainG });

    debugGroupEnd(settings, "debugMode");
    files.forEach((file) => {
      const { basename } = file;
      addNodesIfNot(mainG, [basename]);
    });
    return mainG;
  }

  // !SECTION OneSource

  // SECTION Breadcrumbs

  bfsAllPaths(g: Graph, startNode: string): string[][] {
    const pathsArr: string[][] = [];
    const queue: { node: string; path: string[] }[] = [
      { node: startNode, path: [] },
    ];
    const visited = [startNode];

    let i = 0;
    while (queue.length !== 0 && i < 1000) {
      i++;
      const { node, path } = queue.shift();
      const extPath = [node, ...path];

      const succsNotVisited = g.hasNode(node)
        ? g.filterOutNeighbors(node, (succ) => !visited.includes(succ))
        : [];
      for (const node of succsNotVisited) {
        visited.push(node);
        queue.push({ node, path: extPath });
      }

      // terminal node
      if (!g.hasNode(node) || succsNotVisited.length === 0) {
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

  getdfsFromNode(g: MultiGraph, node: string) {
    dfsFromNode(g, node, (node, a, depth) => {
      console.log({ node, a, depth });
    });
  }

  getBreadcrumbs(g: Graph, currFile: TFile): string[][] | null {
    const { basename, extension } = currFile;
    if (extension !== "md") return null;

    const { indexNotes } = this.settings;

    let allTrails: string[][] = this.bfsAllPaths(g, basename);

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

  getLimitedTrailSub() {
    const { limitTrailCheckboxStates, userHiers } = this.settings;
    const upFields = getFields(userHiers, "up");
    const downFields = getFields(userHiers, "down");
    let subGraph: MultiGraph;

    if (Object.values(limitTrailCheckboxStates).every((val) => val)) {
      subGraph = getSubForFields(this.mainG, [...upFields, ...downFields]);
    } else {
      const positiveFields = Object.keys(limitTrailCheckboxStates).filter(
        (field) => limitTrailCheckboxStates[field]
      );
      const oppFields = positiveFields.map(
        (field) => getOppFields(userHiers, field)[0]
      );
      subGraph = getSubForFields(this.mainG, [...positiveFields, ...oppFields]);
    }

    const closed = getReflexiveClosure(subGraph, userHiers);
    return getSubForFields(closed, upFields);
  }

  async drawTrail(): Promise<void> {
    const { settings } = this;
    debugGroupStart(settings, "debugMode", "Draw Trail");

    const activeMDView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!settings.showBCs || !activeMDView) {
      debugGroupEnd(settings, "debugMode");
      return;
    }

    const currFile = activeMDView.file;
    const currMetadata = this.app.metadataCache.getFileCache(currFile);

    const previewView = activeMDView.contentEl.querySelector(
      ".markdown-preview-view"
    );
    previewView.querySelector("div.BC-trail")?.remove();
    if (currMetadata.frontmatter?.hasOwnProperty(settings.hideTrailField)) {
      debugGroupEnd(settings, "debugMode");
      return;
    }

    const frontm =
      this.app.metadataCache.getFileCache(currFile)?.frontmatter ?? {};
    if (frontm["kanban-plugin"]) {
      debugGroupEnd(settings, "debugMode");
      return;
    }

    const closedUp = this.getLimitedTrailSub();
    const sortedTrails = this.getBreadcrumbs(closedUp, currFile);
    debug(settings, { sortedTrails });

    const { basename } = currFile;

    const {
      next: { reals: rNext, implieds: iNext },
      prev: { reals: rPrev, implieds: iPrev },
    } = getRealnImplied(this, basename, "next");

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
    VIEWS.forEach((view) => this.app.workspace.detachLeavesOfType(view.type));

    this.visited.forEach((visit) => visit[1].remove());
  }
}
