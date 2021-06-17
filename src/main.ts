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

  constructor(leaf: WorkspaceLeaf, plugin: BreadcrumbsPlugin) {
    super(leaf);
    this.plugin = plugin;
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

  draw() {
    this.contentEl.empty();

    this.contentEl.createDiv("breadcrumb-trail", (trailEl) => {
      ["1", "2"].forEach((crumb) => {
        trailEl.createSpan({ cls: "crumb", text: crumb });
      });
    });
  }

  async onOpen(): Promise<void> {
    this.draw();
  }
}

export default class BreadcrumbsPlugin extends Plugin {
  settings: BreadcrumbsPluginSettings;
  plugin: BreadcrumbsPlugin;

  async onload() {
    console.log("loading plugin");

    await this.loadSettings();

    this.addRibbonIcon("dice", "Breadcrumbs", async () =>
      console.log(this.getBreadcrumbs(await this.initialiseGraph(this.settings)))
    );

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", async () =>
        console.log(this.getBreadcrumbs(await this.initialiseGraph(this.settings)))
      )
    );

    this.addSettingTab(new BreadcrumbsSettingTab(this.app, this));

    this.registerView(
      "breadcrumbs",
      (leaf: WorkspaceLeaf) => new BreadcrumbsView(leaf, this.plugin)
    );
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

  getChildParentArr(nameContentArr: nameContent[], settings: BreadcrumbsPluginSettings) {
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
