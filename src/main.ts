import type { MultiGraph } from "graphology";
import { getPlugin } from "juggl-api";
import { addIcon, EventRef, MarkdownView, Plugin } from "obsidian";
import {
  addFeatherIcon,
  openView,
  wait,
} from "obsidian-community-lib/dist/utils";
import { BCAPI } from "./API";
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
  API_NAME,
} from "./constants";
import { FieldSuggestor } from "./FieldSuggestor";
import type {
  BCAPII,
  BCSettings,
  Directions,
  MyView,
  ViewInfo,
} from "./interfaces";
import { buildClosedG, buildMainG, refreshIndex } from "./refreshIndex";
import { RelationSuggestor } from "./RelationSuggestor";
import { BCSettingTab } from "./Settings/BreadcrumbsSettingTab";
import { getFields } from "./Utils/HierUtils";
import { waitForCache } from "./Utils/ObsidianUtils";
import DucksView from "./Views/DucksView";
import MatrixView from "./Views/MatrixView";
import StatsView from "./Views/StatsView";
import { drawTrail } from "./Views/TrailView";
import TreeView from "./Views/TreeView";
import { BCStore } from "./Visualisations/Juggl";
import { VisModal } from "./Visualisations/VisModal";

export default class BCPlugin extends Plugin {
  settings: BCSettings;
  visited: [string, HTMLDivElement][] = [];
  mainG: MultiGraph;
  closedG: MultiGraph;
  activeLeafChange: EventRef = undefined;
  activeLeafSave: EventRef = undefined;
  layoutChange: EventRef = undefined;
  db: Debugger;
  VIEWS: ViewInfo[];
  api: BCAPII;
  private bcStore: BCStore;

  registerActiveLeafChangeEvent() {
    this.activeLeafChange = this.app.workspace.on(
      "active-leaf-change",
      async () => {
        if (this.settings.refreshOnNoteChange) {
          await refreshIndex(this);
        } else {
          const activeView = this.getActiveTYPEView(MATRIX_VIEW);
          if (activeView) await activeView.draw();
        }
      }
    );
    this.registerEvent(this.activeLeafChange);
  }

  // registerActiveLeafSaveEvent ( ) {
  //   this.activeLeafSave = this.app.workspace.on("" ,
  //   async () => {
  //     if (this.settings.refreshOnNoteSave) {
  //       await refreshIndex (this) ;
  //     }else {
  //       const activeView = this.getActiveTYPEView(MATRIX_VIEW);
  //       if (activeView) await activeView.draw();
  //     }
  //   }
  //   )
  // }

  registerLayoutChangeEvent() {
    this.layoutChange = this.app.workspace.on("layout-change", async () => {
      if (this.settings.showBCs) await drawTrail(this);
    });
    this.registerEvent(this.layoutChange);
  }

  async onload(): Promise<void> {
    console.log("loading breadcrumbs plugin");
    const { app } = this;

    await this.loadSettings();
    this.addSettingTab(new BCSettingTab(app, this));

    this.db = new Debugger(this);

    const { settings } = this;
    const { fieldSuggestor, enableRelationSuggestor } = settings;

    if (fieldSuggestor) this.registerEditorSuggest(new FieldSuggestor(this));
    if (enableRelationSuggestor)
      this.registerEditorSuggest(new RelationSuggestor(this));

    const {
      openMatrixOnLoad,
      openStatsOnLoad,
      openDuckOnLoad,
      openDownOnLoad,
      showBCs,
      showBCsInEditLPMode,
      userHiers,
    } = settings;

    this.VIEWS = [
      {
        plain: "Matrix",
        type: MATRIX_VIEW,
        constructor: MatrixView,
        openOnLoad: openMatrixOnLoad,
      },
      {
        plain: "Stats",
        type: STATS_VIEW,
        constructor: StatsView,
        openOnLoad: openStatsOnLoad,
      },
      {
        plain: "Duck",
        type: DUCK_VIEW,
        constructor: DucksView,
        openOnLoad: openDuckOnLoad,
      },
      {
        plain: "Down",
        type: TREE_VIEW,
        constructor: TreeView,
        openOnLoad: openDownOnLoad,
      },
    ];

    for (const { constructor, type } of this.VIEWS) {
      this.registerView(type, (leaf) => new constructor(leaf, this));
    }

    addIcon(DUCK_ICON, DUCK_ICON_SVG);
    addIcon(TRAIL_ICON, TRAIL_ICON_SVG);

    await waitForCache(this);
    this.mainG = await buildMainG(this);
    this.closedG = buildClosedG(this);

    app.workspace.onLayoutReady(async () => {
      const noFiles = app.vault.getMarkdownFiles().length;
      if (this.mainG?.nodes().length < noFiles) {
        await wait(3000);
        this.mainG = await buildMainG(this);
        this.closedG = buildClosedG(this);
      }

      for (const { openOnLoad, type, constructor } of this.VIEWS) {
        if (openOnLoad) await openView(app, type, constructor);
      }

      if (showBCs) await drawTrail(this);
      this.registerActiveLeafChangeEvent();
      this.registerLayoutChangeEvent();

      // Source for save setting
      // https://github.com/hipstersmoothie/obsidian-plugin-prettier/blob/main/src/main.ts
      const saveCommandDefinition =
        this.app.commands.commands["editor:save-file"];
      const save = saveCommandDefinition?.callback;

      if (typeof save === "function") {
        saveCommandDefinition.callback = async () => {
          await save();
          if (this.settings.refreshOnNoteSave) {
            await refreshIndex(this);
            const activeView = this.getActiveTYPEView(MATRIX_VIEW);
            if (activeView) await activeView.draw();
          }
        };
      }

      app.workspace.iterateAllLeaves((leaf) => {
        if (leaf instanceof MarkdownView)
          //@ts-ignore
          leaf.view.previewMode.rerender(true);
      });
    });

    for (const { type, plain, constructor } of this.VIEWS) {
      this.addCommand({
        id: `show-${type}-view`,
        name: `Open ${plain} View`,
        //@ts-ignore
        checkCallback: async (checking: boolean) => {
          if (checking) return app.workspace.getLeavesOfType(type).length === 0;
          await openView(app, type, constructor);
        },
      });
    }

    this.addCommand({
      id: "open-vis-modal",
      name: "Open Visualisation Modal",
      callback: () => new VisModal(app, this).open(),
    });

    this.addCommand({
      id: "manipulate-hierarchy-notes",
      name: "Adjust Hierarchy Notes",
      callback: () => new HierarchyNoteSelectorModal(app, this).open(),
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
        settings.showBCsInEditLPMode = !showBCsInEditLPMode;
        await this.saveSettings();
        await drawTrail(this);
      },
    });

    this.addCommand({
      id: "Write-Breadcrumbs-to-Current-File",
      name: "Write Breadcrumbs to Current File",
      callback: async () => await writeBCToFile(this),
    });

    this.addCommand({
      id: "Write-Breadcrumbs-to-All-Files",
      name: "Write Breadcrumbs to **ALL** Files",
      callback: async () => await writeBCsToAllFiles(this),
    });

    this.addCommand({
      id: "local-index",
      name: "Copy a Local Index to the clipboard",
      callback: async () => await copyLocalIndex(this),
    });

    this.addCommand({
      id: "global-index",
      name: "Copy a Global Index to the clipboard",
      callback: async () => await copyGlobalIndex(this),
    });
    // this.addCommand({
    //   id: "in-yaml",
    //   name: "TEST: Inside YAML",
    //   callback: async () => console.log(DateTime.now().toFormat("yyyy 'DN'")),
    // });

    ["up", "down", "next", "prev"].forEach((dir: Directions) => {
      this.addCommand({
        id: `jump-to-first-${dir}`,
        name: `Jump to first '${dir}'`,
        callback: async () => await jumpToFirstDir(this, dir),
      });
    });

    getFields(userHiers).forEach((field: string) => {
      this.addCommand({
        id: `new-file-with-curr-as-${field}`,
        name: `Create a new '${field}' from the current note`,
        callback: async () => await thread(this, field),
      });
    });

    this.addRibbonIcon(
      addFeatherIcon("tv") as string,
      "Breadcrumbs Visualisation",
      () => new VisModal(app, this).open()
    );

    this.registerMarkdownCodeBlockProcessor(
      "breadcrumbs",
      getCodeblockCB(this)
    );

    const jugglPlugin = getPlugin(this.app);
    if (jugglPlugin) {
      this.bcStore = new BCStore(this.mainG, this.app.metadataCache);
      jugglPlugin.registerStore(this.bcStore);
    }

    this.api = new BCAPI(app, this);
    // Register API to global window object.
    (window[API_NAME] = this.api) &&
      this.register(() => delete window[API_NAME]);
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

  loadSettings = async () =>
    (this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      await this.loadData()
    ));

  saveSettings = async () => await this.saveData(this.settings);

  onunload(): void {
    console.log("unloading");
    this.VIEWS.forEach(async (view) => {
      this.app.workspace.getLeavesOfType(view.type).forEach((leaf) => {
        leaf.detach();
      });
    });

    this.visited.forEach((visit) => visit[1].remove());
    if (this.bcStore) {
      const jugglPlugin = getPlugin(this.app);
      if (jugglPlugin) {
        // @ts-ignore
        jugglPlugin.removeStore(this.bcStore);
      }
    }
  }
}
