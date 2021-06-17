import {
  App,
  EventRef,
  ItemView,
  Modal,
  Plugin,
  TFile,
  WorkspaceLeaf,
} from "obsidian";
import { Graph } from "graphlib";
import * as graphlib from "graphlib";
import { BreadcrumbsSettingTab } from "src/BreadcrumbsSettingTab";
import type BreadcrumbsComponent from "src/BreadcrumbsView.svelte";

interface BreadcrumbsPluginSettings {
  parentFieldName: string;
}

const DEFAULT_SETTINGS: BreadcrumbsPluginSettings = {
  parentFieldName: "parent",
};

interface nameContent {
  fileName: string;
  content: string;
}

interface childParent {
  child: string;
  parent: string;
}

const VIEW_TYPE_BREADCRUMBS = "breadcrumbs";
class BreadcrumbsView extends ItemView {
  plugin: BreadcrumbsPlugin;
  changeRef: EventRef = null;
  view: BreadcrumbsComponent;
  crumbs: string[];
  settings: BreadcrumbsPluginSettings;

  constructor(
    leaf: WorkspaceLeaf,
    plugin: BreadcrumbsPlugin,
    settings: BreadcrumbsPluginSettings,
  ) {
    super(leaf);
    this.plugin = plugin;
    this.settings = settings;
    this.registerEvent(this.app.workspace.on('active-leaf-change', async () => await this.draw()));
  }


  onload() {
    super.onload();
  }

  getViewType(): string {
    return VIEW_TYPE_BREADCRUMBS;
  }

  getDisplayText(): string {
    return "Breadcrumbs";
  }


  async getNameContentArr(): Promise<nameContent[]> {
    const nameContentArr: nameContent[] = [];
    const files: TFile[] = this.app.vault.getMarkdownFiles();
    files.forEach(async (file) => {
      const content = await this.app.vault.cachedRead(file);
      nameContentArr.push({ fileName: file.basename, content });
    });
    return nameContentArr;
  }

  // Grab parent fields from note content
  // Currently, this doesn't wait until the cachedRead is complete for all files
  getChildParentArr(
    nameContentArr: nameContent[],
    settings: BreadcrumbsPluginSettings
  ) {
    // Regex to match the `parent` metadata field
    const parentFieldName = settings.parentFieldName;
    const yamlOrInlineParent = new RegExp(`${parentFieldName}::? (.+)`, "i");

    const childParentArr: childParent[] = nameContentArr.map(
      (arr: nameContent) => {
        const matches = arr.content.match(yamlOrInlineParent);
        if (matches) {
          const dropBrackets = matches[1].replace("[[", "").replace("]]", "");
          return { child: arr.fileName, parent: dropBrackets };
        } else {
          return { child: arr.fileName, parent: "" };
        }
      }
    );
    return childParentArr;
  }

  // Graph stuff...
  async initialiseGraph(settings: BreadcrumbsPluginSettings) {
    const nameContentArr = await this.getNameContentArr();
    const childParentArr = this.getChildParentArr(nameContentArr, settings);
    const g = new Graph();
    g.setNode("Index", "Index");

    childParentArr.forEach((edge) => {
      g.setNode(edge.child, edge.child);
      if (edge.parent !== "") {
        // const label = `${edge.child} -> ${edge.parent}`;
        g.setEdge(edge.child, edge.parent);
      }
    });
    return g;
  }

  getBreadcrumbs(g: Graph, to: string = "Index") {
    const from = this.app.workspace.getActiveFile().basename;
    const paths = graphlib.alg.dijkstra(g, from);
    console.log({ paths });
    let step = to;
    const breadcrumbs: string[] = [];

    while (paths[step].distance !== 0) {
      breadcrumbs.push(step);
      step = paths[step].predecessor;
    }

    breadcrumbs.push(from);
    return breadcrumbs;
  }


  async draw() {
    const g = await this.initialiseGraph(this.settings);
    console.log({g});
    const crumbs = this.getBreadcrumbs(g);

    this.contentEl.empty();

    this.contentEl.createDiv("breadcrumb-trail", (trailEl) => {
      crumbs.forEach((crumb) => {
        trailEl.createSpan({ cls: "crumb", text: crumb });
        trailEl.createSpan({ text: " > " });
      });
    });
  }

  async onOpen(): Promise<void> {
    await this.draw();
  }
}

export default class BreadcrumbsPlugin extends Plugin {
  settings: BreadcrumbsPluginSettings;
  plugin: BreadcrumbsPlugin;
  view: BreadcrumbsView;

  async onload() {
    console.log("loading plugin");

    await this.loadSettings();

    this.addRibbonIcon("dice", "Breadcrumbs", async () => {
      const crumbs = this.view.getBreadcrumbs(
        await this.view.initialiseGraph(this.settings)
      );
    });

    this.addCommand({
      id: "show-breadcrumb-view",
      name: "Open view",
      checkCallback: (checking: boolean) => {
        if (checking) {
          return (
            this.app.workspace.getLeavesOfType(VIEW_TYPE_BREADCRUMBS).length ===
            0
          );
        }
        this.initLeaf();
      },
    });

    // this.registerEvent(
    //   this.app.workspace.on("active-leaf-change", async () =>
    //     console.log(
    //       this.view.getBreadcrumbs(await this.view.initialiseGraph(this.settings))
    //     )
    //   )
    // );

    this.addSettingTab(new BreadcrumbsSettingTab(this.app, this));

    this.registerView(VIEW_TYPE_BREADCRUMBS, (leaf: WorkspaceLeaf) => {
      // const crumbs = this.getBreadcrumbs(
      //   await this.initialiseGraph(this.settings)
      // );
      return this.view = new BreadcrumbsView(leaf, this.plugin, this.settings);
    });
  }

  initLeaf(): void {
    // if (this.app.workspace.getLeavesOfType(VIEW_TYPE_BREADCRUMBS).length) {
    //   return;
    // }
    this.app.workspace.getRightLeaf(false).setViewState({
      type: VIEW_TYPE_BREADCRUMBS,
    });
  }

  

  onunload() {
    console.log("unloading plugin");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class SampleModal extends Modal {
  constructor(app: App) {
    super(app);
  }

  onOpen() {
    let { contentEl } = this;
    contentEl.setText("Woah!");
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }
}
