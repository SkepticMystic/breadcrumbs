import {
  App,
  EventRef,
  ItemView,
  Modal,
  Notice,
  Plugin,
  TFile,
  WorkspaceLeaf,
} from "obsidian";
import { Graph } from "graphlib";
import * as graphlib from "graphlib";
import { SampleSettingTab } from "./SampleSettingTab";
import BreadcrumbsComponent from "BreadcrumbsView.svelte";

interface BreadcrumbsPluginSettings {
  mySetting: string;
}

const DEFAULT_SETTINGS: BreadcrumbsPluginSettings = {
  mySetting: "default",
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
  private view: BreadcrumbsComponent;

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

  async onOpen(): Promise<void> {
    this.view = new BreadcrumbsComponent({
      target: this.contentEl,
      props: {
        levels: ["a", "b", "c"],
      },
    });
  }
}

export default class BreadcrumbsPlugin extends Plugin {
  settings: BreadcrumbsPluginSettings;
  private view: BreadcrumbsView;
  plugin: BreadcrumbsPlugin;

  async onload() {
    console.log("loading plugin");

    await this.loadSettings();

    this.addRibbonIcon("dice", "Breadcrumbs", async () =>
      console.log(this.getBreadcrumbs(await this.initialiseGraph()))
    );

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", async () =>
        console.log(this.getBreadcrumbs(await this.initialiseGraph()))
      )
    );

    this.addSettingTab(new SampleSettingTab(this.app, this));

    this.registerView(
      "breadcrumbs",
      (leaf: WorkspaceLeaf) =>
        (this.view = new BreadcrumbsView(leaf, this.plugin))
    );

    // this.registerDomEvent(document, "click", (evt: MouseEvent) => {
    //   console.log("click", evt);
    // });

    // this.registerInterval(
    //   window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
    // );
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

  getChildParentArr(nameContentArr: nameContent[]) {
    // Regex to match the `parent` metadata field
    const parentField = "yz-parent";
    const yamlOrInlineParent = new RegExp(`${parentField}::? (.+)`, "i");

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
  async initialiseGraph() {
    const nameContentArr = await this.getNameContentArr();
    const childParentArr = this.getChildParentArr(nameContentArr);
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
