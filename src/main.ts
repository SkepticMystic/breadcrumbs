import { getApi } from "@aidenlx/folder-note-core";
import Graph, { MultiGraph } from "graphology";
import { error, info, warn } from "loglevel";
import {
  addIcon,
  EventRef,
  MarkdownView,
  Notice,
  Plugin,
  TFile,
} from "obsidian";
import {
  addFeatherIcon,
  openView,
  wait,
  waitForResolvedLinks,
} from "obsidian-community-lib/dist/utils";
import { Debugger } from "src/Debugger";
import { addCSVCrumbs, getCSVRows } from "./AlternativeHierarchies/CSVCrumbs";
import { addDendronNotesToGraph } from "./AlternativeHierarchies/DendronNotes";
import { addFolderNotesToGraph } from "./AlternativeHierarchies/FolderNotes";
import {
  addHNsToGraph,
  getHierarchyNoteItems,
} from "./AlternativeHierarchies/HierarchyNotes/HierarchyNotes";
import { HierarchyNoteSelectorModal } from "./AlternativeHierarchies/HierarchyNotes/HierNoteModal";
import { addLinkNotesToGraph } from "./AlternativeHierarchies/LinkNotes";
import { addRegexNotesToGraph } from "./AlternativeHierarchies/RegexNotes";
import { addTagNotesToGraph } from "./AlternativeHierarchies/TagNotes";
import { addTraverseNotesToGraph } from "./AlternativeHierarchies/TraverseNotes";
import { BCSettingTab } from "./BreadcrumbsSettingTab";
import { createJugglTrail, getCodeblockCB } from "./Codeblocks";
import { copyGlobalIndex, copyLocalIndex } from "./Commands/CreateIndex";
import { jumpToFirstDir } from "./Commands/jumpToFirstDir";
import { thread } from "./Commands/threading";
import { writeBCsToAllFiles, writeBCToFile } from "./Commands/WriteBCs";
import NextPrev from "./Components/NextPrev.svelte";
import TrailGrid from "./Components/TrailGrid.svelte";
import TrailPath from "./Components/TrailPath.svelte";
import {
  BC_ALTS,
  BC_FOLDER_NOTE,
  BC_HIDE_TRAIL,
  BC_LINK_NOTE,
  BC_REGEX_NOTE,
  BC_TAG_NOTE,
  BC_TRAVERSE_NOTE,
  DEFAULT_SETTINGS,
  DUCK_ICON,
  DUCK_ICON_SVG,
  DUCK_VIEW,
  JUGGL_TRAIL_DEFAULTS,
  MATRIX_VIEW,
  STATS_VIEW,
  TRAIL_ICON,
  TRAIL_ICON_SVG,
  TREE_VIEW,
} from "./constants";
import DucksView from "./DucksView";
import { FieldSuggestor } from "./FieldSuggestor";
import {
  addNodesIfNot,
  buildObsGraph,
  getOppFields,
  getReflexiveClosure,
  getSourceOrder,
  getSubForFields,
  getSubInDirs,
  getTargetOrder,
  populateMain,
} from "./graphUtils";
import type {
  BCSettings,
  Directions,
  dvFrontmatterCache,
  MyView,
  ViewInfo,
} from "./interfaces";
import MatrixView from "./MatrixView";
import {
  addJugglLinksToGraph,
  getDVMetadataCache,
  getJugglLinks,
  getObsMetadataCache,
  parseFieldValue,
} from "./refreshIndex";
import {
  getDVBasename,
  getFields,
  getRealnImplied,
  iterateHiers,
} from "./sharedFunctions";
import StatsView from "./StatsView";
import TreeView from "./TreeView";
import { VisModal } from "./VisModal";
import { createdJugglCB, createJugglTrail } from "./Visualisations/CBJuggl";
import { jumpToFirstDir } from "./jumpToFirstDir";
import { thread } from "./threading";

export default class BCPlugin extends Plugin {
  settings: BCSettings;
  visited: [string, HTMLDivElement][] = [];
  refreshIntervalID: number;
  mainG: MultiGraph;
  activeLeafChange: EventRef = undefined;
  layoutChange: EventRef = undefined;
  statusBatItemEl: HTMLElement = undefined;
  db: Debugger;
  VIEWS: ViewInfo[];

  async refreshIndex() {
    if (!this.activeLeafChange) this.registerActiveLeafChangeEvent();
    if (!this.layoutChange) this.registerLayoutChangeEvent();
    this.mainG = await this.initGraphs();
    for (const view of this.VIEWS)
      await this.getActiveTYPEView(view.type)?.draw();
    if (this.settings.showBCs) await this.drawTrail();
    if (this.settings.showRefreshNotice) new Notice("Index refreshed");
  }

  registerActiveLeafChangeEvent() {
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

  registerLayoutChangeEvent() {
    this.layoutChange = this.app.workspace.on("layout-change", async () => {
      if (this.settings.showBCs) await this.drawTrail();
    });
    this.registerEvent(this.layoutChange);
  }

  async waitForCache() {
    if (this.app.plugins.enabledPlugins.has("dataview")) {
      let basename: string;
      while (
        !basename ||
        !this.app.plugins.plugins.dataview.api.page(basename)
      ) {
        await wait(100);
        basename = this.app?.workspace?.getActiveFile()?.basename;
      }
    } else {
      await waitForResolvedLinks(this.app);
    }
  }

  async onload(): Promise<void> {
    console.log("loading breadcrumbs plugin");

    await this.loadSettings();
    const { settings } = this;
    this.addSettingTab(new BCSettingTab(this.app, this));

    if (typeof settings.debugMode === "boolean") {
      settings.debugMode = settings.debugMode ? "DEBUG" : "WARN";
      await this.saveSettings();
    }

    // Prevent breaking change
    //@ts-ignore
    const { userHierarchies } = settings;
    if (userHierarchies !== undefined && userHierarchies.length > 0) {
      settings.userHiers = userHierarchies;
      //@ts-ignore
      delete settings.userHierarchies;
      await this.saveSettings();
    }

    ["prev", "next"].forEach((dir) => {
      settings.userHiers.forEach(async (hier, i) => {
        if (hier[dir] === undefined) settings.userHiers[i][dir] = [];
        await this.saveSettings();
      });
    });

    if (settings.hasOwnProperty("limitTrailCheckboxStates")) {
      //@ts-ignore
      delete settings.limitTrailCheckboxStates;
      await this.saveSettings();
    }
    if (settings.hasOwnProperty("limitWriteBCCheckboxStates")) {
      //@ts-ignore
      delete settings.limitWriteBCCheckboxStates;
      await this.saveSettings();
    }

    if (!settings.CHECKBOX_STATES_OVERWRITTEN) {
      const fields = getFields(settings.userHiers);
      settings.limitWriteBCCheckboxes = fields;
      settings.limitJumpToFirstFields = fields;
      settings.limitTrailCheckboxes = getFields(settings.userHiers, "up");
      settings.CHECKBOX_STATES_OVERWRITTEN = true;
      await this.saveSettings();
    }

    this.VIEWS = [
      {
        plain: "Matrix",
        type: MATRIX_VIEW,
        constructor: MatrixView,
        openOnLoad: settings.openMatrixOnLoad,
      },
      {
        plain: "Stats",
        type: STATS_VIEW,
        constructor: StatsView,
        openOnLoad: settings.openStatsOnLoad,
      },
      {
        plain: "Duck",
        type: DUCK_VIEW,
        constructor: DucksView,
        openOnLoad: settings.openDuckOnLoad,
      },
      {
        plain: "Down",
        type: TREE_VIEW,
        constructor: TreeView,
        openOnLoad: settings.openDownOnLoad,
      },
    ];

    this.db = new Debugger(this);
    this.registerEditorSuggest(new FieldSuggestor(this));

    for (const { constructor, type } of this.VIEWS) {
      this.registerView(type, (leaf) => new constructor(leaf, this));
    }
    addIcon(DUCK_ICON, DUCK_ICON_SVG);
    addIcon(TRAIL_ICON, TRAIL_ICON_SVG);

    await this.waitForCache();
    this.mainG = await this.initGraphs();

    this.app.workspace.onLayoutReady(async () => {
      const noFiles = this.app.vault.getMarkdownFiles().length;
      if (this.mainG?.nodes().length < noFiles) {
        await wait(3000);
        this.mainG = await this.initGraphs();
      }

      for (const { openOnLoad, type, constructor } of this.VIEWS) {
        if (openOnLoad) await openView(this.app, type, constructor);
      }

      if (settings.showBCs) await this.drawTrail();
      this.registerActiveLeafChangeEvent();
      this.registerLayoutChangeEvent();

      this.app.workspace.iterateAllLeaves((leaf) => {
        if (leaf instanceof MarkdownView) {
          //@ts-ignore
          leaf.view.previewMode.rerender(true);
        }
      });
    });

    for (const { type, plain, constructor } of this.VIEWS) {
      this.addCommand({
        id: `show-${type}-view`,
        name: `Open ${plain} View`,
        //@ts-ignore
        checkCallback: async (checking: boolean) => {
          if (checking) {
            return this.app.workspace.getLeavesOfType(type).length === 0;
          }
          await openView(this.app, type, constructor);
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
      id: "manipulate-hierarchy-notes",
      name: "Adjust Hierarchy Notes",
      callback: () => new HierarchyNoteSelectorModal(this.app, this).open(),
    });

    this.addCommand({
      id: "Refresh-Breadcrumbs-Index",
      name: "Refresh Breadcrumbs Index",
      callback: async () => await this.refreshIndex(),
    });

    this.addCommand({
      id: "Toggle-trail-in-Edit&LP",
      name: "Toggle: Show Trail/Grid in Edit & LP mode",
      callback: async () => {
        settings.showBCsInEditLPMode = !settings.showBCsInEditLPMode;
        await this.saveSettings();
        await this.drawTrail();
      },
    });

    this.addCommand({
      id: "Write-Breadcrumbs-to-Current-File",
      name: "Write Breadcrumbs to Current File",
      callback: async () => {
        const currFile = this.app.workspace.getActiveFile();
        await writeBCToFile(this, currFile);
      },
    });

    this.addCommand({
      id: "Write-Breadcrumbs-to-All-Files",
      name: "Write Breadcrumbs to **ALL** Files",
      callback: async () => writeBCsToAllFiles(this),
    });

    this.addCommand({
      id: "local-index",
      name: "Copy a Local Index to the clipboard",
      callback: async () => copyLocalIndex(this),
    });

    this.addCommand({
      id: "global-index",
      name: "Copy a Global Index to the clipboard",
      callback: async () => copyGlobalIndex(this),
    });

    ["up", "down", "next", "prev"].forEach((dir: Directions) => {
      this.addCommand({
        id: `jump-to-first-${dir}`,
        name: `Jump to first '${dir}'`,
        callback: async () => jumpToFirstDir(this, dir),
      });
    });

    getFields(settings.userHiers).forEach((field: string) => {
      this.addCommand({
        id: `new-file-with-curr-as-${field}`,
        name: `Create a new '${field}' from the current note`,
        callback: async () => thread(this, field),
      });
    });

    this.addRibbonIcon(
      addFeatherIcon("tv") as string,
      "Breadcrumbs Visualisation",
      () => new VisModal(this.app, this).open()
    );

    this.registerMarkdownCodeBlockProcessor(
      "breadcrumbs",
      getCodeblockCB(this)
    );
  }

  getActiveTYPEView(type: string): MyView | null {
    const { constructor } = this.VIEWS.find((view) => view.type === type);
    const leaves = this.app.workspace.getLeavesOfType(type);
    if (leaves && leaves.length >= 1) {
      const { view } = leaves[0];
      if (view instanceof constructor) return view;
    }
    return null;
  }

  // SECTION OneSource

  /** Use Folder Notes Plugin's FNs as BC-folder-notes */
  addFolderNotePluginToGraph() {
    const api = getApi(this);
    api.getFolderNote;
  }

  async initGraphs(): Promise<MultiGraph> {
    const mainG = new MultiGraph();
    try {
      const { settings, app, db } = this;
      db.start2G("initGraphs");
      const files = app.vault.getMarkdownFiles();
      const dvQ = !!app.plugins.enabledPlugins.has("dataview");

      let frontms: dvFrontmatterCache[] = dvQ
        ? this.getDVMetadataCache(files)
        : this.getObsMetadataCache(files);

      if (frontms.some((frontm) => frontm === undefined)) {
        await wait(2000);
        frontms = dvQ
          ? this.getDVMetadataCache(files)
          : this.getObsMetadataCache(files);
        // db.end2G();
        // return mainG;
      }

      const { userHiers } = settings;
      if (userHiers.length === 0) {
        db.end2G();
        new Notice("You do not have any Breadcrumbs hierarchies set up.");
        return mainG;
      }

      const useCSV = settings.CSVPaths !== "";
      const CSVRows = useCSV ? await getCSVRows(this) : [];

      const eligableAlts: { [altField: string]: dvFrontmatterCache[] } = {};
      BC_ALTS.forEach((alt) => (eligableAlts[alt] = []));

      function noticeIfBroken(frontm: dvFrontmatterCache): void {
        const basename = getDVBasename(frontm.file);
        // @ts-ignore
        if (frontm[BC_FOLDER_NOTE] === true) {
          const msg = `CONSOLE LOGGED: ${basename} is using a deprecated folder-note value. Instead of 'true', it now takes in the fieldName you want to use.`;
          new Notice(msg);
          warn(msg);
        }
        // @ts-ignore
        if (frontm[BC_LINK_NOTE] === true) {
          const msg = `CONSOLE LOGGED: ${basename} is using a deprecated link-note value. Instead of 'true', it now takes in the fieldName you want to use.`;
          new Notice(msg);
          warn(msg);
        }
        if (frontm["BC-folder-note-up"]) {
          const msg = `CONSOLE LOGGED: ${basename} is using a deprecated folder-note-up value. Instead of setting the fieldName here, it goes directly into 'BC-folder-note: fieldName'.`;
          new Notice(msg);
          warn(msg);
        }
      }

      db.start2G("addFrontmatterToGraph");
      frontms.forEach((frontm) => {
        BC_ALTS.forEach((alt) => {
          if (frontm[alt]) {
            eligableAlts[alt].push(frontm);
          }
        });

        noticeIfBroken(frontm);

        const basename = getDVBasename(frontm.file);
        const sourceOrder = this.getSourceOrder(frontm);

        iterateHiers(userHiers, (hier, dir, field) => {
          const values = this.parseFieldValue(frontm[field]);

          values.forEach((target) => {
            if (
              (target.startsWith("<%") && target.endsWith("%>")) ||
              (target.startsWith("{{") && target.endsWith("}}"))
            )
              return;
            const targetOrder = this.getTargetOrder(frontms, target);

            this.populateMain(
              mainG,
              basename,
              field,
              target,
              sourceOrder,
              targetOrder
            );
          });
          if (useCSV) addCSVCrumbs(mainG, CSVRows, dir, field);
        });
      });

      db.end2G();

      // SECTION  Juggl Links
      const jugglLinks =
        app.plugins.plugins.juggl || settings.parseJugglLinksWithoutJuggl
          ? await getJugglLinks(this, files)
          : [];

      if (jugglLinks.length)
        addJugglLinksToGraph(settings, jugglLinks, frontms, mainG);

      // !SECTION  Juggl Links

      // SECTION  Hierarchy Notes
      db.start2G("Hierarchy Notes");

      if (settings.hierarchyNotes[0] !== "") {
        for (const note of settings.hierarchyNotes) {
          const file = app.metadataCache.getFirstLinkpathDest(note, "");
          if (file) {
            addHNsToGraph(
              settings,
              await getHierarchyNoteItems(this, file),
              mainG
            );
          } else {
            new Notice(
              `${note} is no longer in your vault. It is best to remove it in Breadcrumbs settings.`
            );
          }
        }
      }

      db.end2G();
      // !SECTION  Hierarchy Notes
      db.start1G("Alternative Hierarchies");

      addFolderNotesToGraph(
        settings,
        eligableAlts[BC_FOLDER_NOTE],
        frontms,
        mainG
      );
      addTagNotesToGraph(this, eligableAlts[BC_TAG_NOTE], frontms, mainG);
      addLinkNotesToGraph(this, eligableAlts[BC_LINK_NOTE], frontms, mainG);
      addRegexNotesToGraph(this, eligableAlts[BC_REGEX_NOTE], frontms, mainG);
      // this.addNamingSystemNotesToGraph(frontms, mainG);
      addTraverseNotesToGraph(
        this,
        eligableAlts[BC_TRAVERSE_NOTE],
        mainG,
        buildObsGraph(app)
      );
      addDendronNotesToGraph(this, frontms, mainG);

      db.end1G();

      files.forEach((file) => {
        const { basename } = file;
        addNodesIfNot(mainG, [basename]);
      });
      db.end2G("graphs inited", { mainG });
      return mainG;
    } catch (err) {
      error(err);
      this.db.end2G();
      return mainG;
    }
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

      const succs = g.hasNode(node)
        ? g.filterOutNeighbors(node, (n) => !path.includes(n))
        : [];
      for (const node of succs) {
        queue.push({ node, path: extPath });
      }

      // terminal node
      if (!g.hasNode(node) || succs.length === 0) {
        pathsArr.push(extPath);
      }
    }
    // Splice off the current note from the path
    pathsArr.forEach((path) => {
      if (path.length) path.splice(path.length - 1, 1);
    });
    info({ pathsArr });
    return pathsArr;
  }

  getBreadcrumbs(g: Graph, currFile: TFile): string[][] | null {
    const { basename, extension } = currFile;
    if (extension !== "md") return null;

    const allTrails = this.bfsAllPaths(g, basename);
    let filteredTrails = [...allTrails];

    const { indexNotes, showAllPathsIfNoneToIndexNote } = this.settings;
    // Filter for index notes
    if (
      // Works for `undefined` and `""`
      indexNotes[0] &&
      filteredTrails.length
    ) {
      filteredTrails = filteredTrails.filter((trail) =>
        indexNotes.includes(trail[0])
      );
      if (filteredTrails.length === 0 && showAllPathsIfNoneToIndexNote)
        filteredTrails = [...allTrails];
    }

    const sortedTrails = filteredTrails
      .filter((trail) => trail.length > 0)
      .sort((a, b) => a.length - b.length);

    return sortedTrails;
  }

  getLimitedTrailSub() {
    const { limitTrailCheckboxes, userHiers } = this.settings;
    let subGraph: MultiGraph;

    if (
      getFields(userHiers).every((field) =>
        limitTrailCheckboxes.includes(field)
      )
    ) {
      subGraph = getSubInDirs(this.mainG, "up", "down");
    } else {
      const oppFields = limitTrailCheckboxes
        .map((field) => getOppFields(userHiers, field)[0])
        .filter((field) => field !== undefined);
      subGraph = getSubForFields(this.mainG, [
        ...limitTrailCheckboxes,
        ...oppFields,
      ]);
    }

    const closed = getReflexiveClosure(subGraph, userHiers);
    return getSubInDirs(closed, "up");
  }

  async drawTrail(): Promise<void> {
    try {
      const { settings, db } = this;
      const {
        showBCs,
        noPathMessage,
        respectReadableLineLength,
        showTrail,
        showGrid,
        showJuggl,
        showPrevNext,
        showBCsInEditLPMode,
      } = settings;
      db.start2G("drawTrail");
      const activeMDView = this.app.workspace.getActiveViewOfType(MarkdownView);
      const mode = activeMDView?.getMode();
      if (
        !showBCs ||
        !activeMDView ||
        (mode !== "preview" && !showBCsInEditLPMode)
      ) {
        activeMDView?.containerEl.querySelector(".BC-trail")?.remove();
        db.end2G();
        return;
      }

      const { file } = activeMDView;
      const { frontmatter } = this.app.metadataCache.getFileCache(file) ?? {};

      // @ts-ignore
      const { hideTrailField } = settings;
      if (hideTrailField && frontmatter?.[hideTrailField]) {
        new Notice(
          `${file.basename} still uses an old frontmatter field to hide it's trail. This settings has been deprecated in favour of a standardised field: 'BC-hide-trail'. Please change it so that this note's trail is hidden again.`
        );
      }
      if (frontmatter?.[BC_HIDE_TRAIL] || frontmatter?.["kanban-plugin"]) {
        db.end2G();
        return;
      }

      let view: HTMLElement;
      let livePreview: boolean = false;
      if (mode === "preview") {
        view = activeMDView.previewMode.containerEl.querySelector(
          "div.markdown-preview-view"
        );
      } else {
        view = activeMDView.contentEl.querySelector("div.markdown-source-view");
        if (view.hasClass("is-live-preview")) livePreview = true;
      }

      activeMDView.containerEl
        .querySelectorAll(".BC-trail")
        ?.forEach((trail) => trail.remove());

      const closedUp = this.getLimitedTrailSub();
      const sortedTrails = this.getBreadcrumbs(closedUp, file);
      info({ sortedTrails });

      const { basename } = file;

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

      const noItems = !sortedTrails.length && !next.length && !prev.length;

      if (noItems && noPathMessage === "") {
        db.end2G();
        return;
      }

      const selectorForMaxWidth =
        mode === "preview"
          ? ".markdown-preview-view.is-readable-line-width .markdown-preview-sizer"
          : "";

      const elForMaxWidth =
        selectorForMaxWidth !== ""
          ? document.querySelector(selectorForMaxWidth)
          : null;
      const max_width = elForMaxWidth
        ? getComputedStyle(elForMaxWidth).getPropertyValue("max-width")
        : "80%";

      const trailDiv = createDiv({
        cls: `BC-trail ${
          respectReadableLineLength
            ? "is-readable-line-width markdown-preview-sizer markdown-preview-section"
            : ""
        }`,
        attr: {
          style:
            (mode !== "preview" ? `max-width: ${max_width};` : "") +
            "margin: 0 auto",
        },
      });

      this.visited.push([file.path, trailDiv]);

      if (mode === "preview") {
        view.querySelector("div.markdown-preview-sizer").before(trailDiv);
      } else {
        const cmEditor = view.querySelector("div.cm-editor");
        const cmSizer = view.querySelector("div.CodeMirror-sizer");
        if (cmEditor) cmEditor.firstChild?.before(trailDiv);
        if (cmSizer) cmSizer.before(trailDiv);
      }

      trailDiv.empty();
      if (settings.indexNotes.includes(basename)) {
        trailDiv.innerText = "Index Note";
        db.end2G();
        return;
      }

      if (noItems) {
        trailDiv.innerText = noPathMessage;
        db.end2G();
        return;
      }

      const props = { sortedTrails, app: this.app, plugin: this };

      if (showTrail && sortedTrails.length) {
        new TrailPath({
          target: trailDiv,
          props,
        });
      }
      if (showGrid && sortedTrails.length) {
        new TrailGrid({
          target: trailDiv,
          props,
        });
      }
      if (showPrevNext && (next.length || prev.length)) {
        new NextPrev({
          target: trailDiv,
          props: { app: this.app, plugin: this, next, prev },
        });
      }
      if (showJuggl && sortedTrails.length) {
        createJugglTrail(
          this,
          trailDiv,
          props.sortedTrails,
          basename,
          JUGGL_TRAIL_DEFAULTS
        );
      }
      db.end2G();
    } catch (err) {
      error(err);
      this.db.end2G();
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
    this.VIEWS.forEach(async (view) => {
      // await this.getActiveTYPEView(view.type)?.close();
      this.app.workspace.detachLeavesOfType(view.type);
    });

    this.visited.forEach((visit) => visit[1].remove());
  }
}
