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

interface BreadcrumbsPluginSettings {
  parentFieldName: string;
  indexNote: string;
}

const DEFAULT_SETTINGS: BreadcrumbsPluginSettings = {
  parentFieldName: "parent",
  indexNote: "Index",
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
  settings: BreadcrumbsPluginSettings;

  constructor(
    leaf: WorkspaceLeaf,
    plugin: BreadcrumbsPlugin,
    settings: BreadcrumbsPluginSettings
  ) {
    super(leaf);
    this.plugin = plugin;
    this.settings = settings;
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", async () => await this.draw())
    );
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
  getChildParentArr(
    nameContentArr: nameContent[],
    settings: BreadcrumbsPluginSettings
  ) {
    // Regex to match the `parent` metadata field
    const parentFieldName = settings.parentFieldName;
    const yamlOrInlineParent = new RegExp(
      `.*?${parentFieldName}::? \\[\\[(.+)\\]\\].*?`,
      "i"
    );

    const childParentArr: childParent[] = nameContentArr.map(
      (arr: nameContent) => {
        const match = arr.content.match(yamlOrInlineParent);
        if (match) {
          const parent = match[1].replace(/(.+)(#|\|).+/g, "$1");
          return { child: arr.fileName, parent };
        } else {
          return { child: arr.fileName, parent: "" };
        }
      }
    );
    console.log(childParentArr);
    return childParentArr;
  }

  // Graph stuff...
  async initialiseGraph(settings: BreadcrumbsPluginSettings) {
    const nameContentArr = await this.getNameContentArr();
    const childParentArr = this.getChildParentArr(nameContentArr, settings);
    const g = new Graph();
    const indexNote = settings.indexNote;
    g.setNode(indexNote, indexNote);

    childParentArr.forEach((edge) => {
      g.setNode(edge.child, edge.child);
      if (edge.parent !== "") {
        g.setEdge(edge.child, edge.parent);
      }
    });
    return g;
  }

  getBreadcrumbs(g: Graph, settings: BreadcrumbsPluginSettings) {
    const to = settings.indexNote;
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
    console.log({ g });
    const crumbs = this.getBreadcrumbs(g, this.settings);

    this.contentEl.empty();

    const breadcrumbTrail = this.contentEl.createDiv(
      "breadcrumb-trail",
      (trailEl) => {
        crumbs.forEach((crumb) => {
          const link = trailEl.createEl("a", {
            cls: "internal-link",
            text: crumb,
          });
          link.href = null;
          link.addEventListener("click", () => {
            this.app.workspace.openLinkText(
              crumb,
              this.app.workspace.getActiveFile().path
            );
          });
          trailEl.createDiv({ text: " ^ " });
        });
      }
    );

    breadcrumbTrail.removeChild(breadcrumbTrail.lastChild);
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
        await this.view.initialiseGraph(this.settings),
        this.settings
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
      return (this.view = new BreadcrumbsView(
        leaf,
        this.plugin,
        this.settings
      ));
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
