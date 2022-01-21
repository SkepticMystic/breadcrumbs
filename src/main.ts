import type { MultiGraph } from "graphology";
import { addIcon, EventRef, MarkdownView, Plugin } from "obsidian";
import {
  addFeatherIcon,
  openView,
  wait,
  waitForResolvedLinks,
} from "obsidian-community-lib/dist/utils";
import { Debugger } from "src/Debugger";
import { HierarchyNoteSelectorModal } from "./AlternativeHierarchies/HierarchyNotes/HierNoteModal";
import { getCodeblockCB } from "./Codeblocks";
import { copyGlobalIndex, copyLocalIndex } from "./Commands/CreateIndex";
import { jumpToFirstDir } from "./Commands/jumpToFirstDir";
import { thread } from "./Commands/threading";
import { writeBCsToAllFiles, writeBCToFile } from "./Commands/WriteBCs";
import {
  DEFAULT_SETTINGS,
  DUCK_ICON,
  DUCK_ICON_SVG,
  DUCK_VIEW,
  MATRIX_VIEW,
  STATS_VIEW,
  TRAIL_ICON,
  TRAIL_ICON_SVG,
  TREE_VIEW,
} from "./constants";
import { FieldSuggestor } from "./FieldSuggestor";
import type { BCSettings, Directions, MyView, ViewInfo } from "./interfaces";
import { buildClosedG, buildMainG, refreshIndex } from "./refreshIndex";
import { BCSettingTab } from "./Settings/BreadcrumbsSettingTab";
import { getFields } from "./Utils/HierUtils";
import DucksView from "./Views/DucksView";
import MatrixView from "./Views/MatrixView";
import StatsView from "./Views/StatsView";
import { drawTrail } from "./Views/TrailView";
import TreeView from "./Views/TreeView";
import { VisModal } from "./Visualisations/VisModal";

export default class BCPlugin extends Plugin {
  settings: BCSettings;
  visited: [string, HTMLDivElement][] = [];
  refreshIntervalID: number;
  mainG: MultiGraph;
  closedG: MultiGraph;
  activeLeafChange: EventRef = undefined;
  layoutChange: EventRef = undefined;
  statusBatItemEl: HTMLElement = undefined;
  db: Debugger;
  VIEWS: ViewInfo[];

  registerActiveLeafChangeEvent() {
    this.activeLeafChange = this.app.workspace.on(
      "active-leaf-change",
      async () => {
        if (this.settings.refreshOnNoteChange) {
          await refreshIndex(this);
        } else {
          const activeView = this.getActiveTYPEView(MATRIX_VIEW);
          if (activeView) await activeView.draw();
          // if (this.settings.showBCs) await drawTrail(this);
        }
      }
    );
    this.registerEvent(this.activeLeafChange);
  }

  registerLayoutChangeEvent() {
    this.layoutChange = this.app.workspace.on("layout-change", async () => {
      if (this.settings.showBCs) await drawTrail(this);
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

    // Prevent breaking change
    if (typeof settings.debugMode === "boolean") {
      settings.debugMode = settings.debugMode ? "DEBUG" : "WARN";
      await this.saveSettings();
    }

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
    this.mainG = await buildMainG(this);
    this.closedG = buildClosedG(this);

    this.app.workspace.onLayoutReady(async () => {
      const noFiles = this.app.vault.getMarkdownFiles().length;
      if (this.mainG?.nodes().length < noFiles) {
        await wait(3000);
        this.mainG = await buildMainG(this);
        this.closedG = buildClosedG(this);
      }

      for (const { openOnLoad, type, constructor } of this.VIEWS) {
        if (openOnLoad) await openView(this.app, type, constructor);
      }

      if (settings.showBCs) await drawTrail(this);
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
      callback: async () => await refreshIndex(this),
    });

    this.addCommand({
      id: "Toggle-trail-in-Edit&LP",
      name: "Toggle: Show Trail/Grid in Edit & LP mode",
      callback: async () => {
        settings.showBCsInEditLPMode = !settings.showBCsInEditLPMode;
        await this.saveSettings();
        await drawTrail(this);
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
      this.app.workspace.getLeavesOfType(view.type).forEach((leaf) => {
        leaf.detach();
      });
    });

    this.visited.forEach((visit) => visit[1].remove());
  }
}
