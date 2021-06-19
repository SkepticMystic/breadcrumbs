import { ItemView, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { Graph } from "graphlib";
import * as graphlib from "graphlib";
import { BreadcrumbsSettingTab } from "src/BreadcrumbsSettingTab";

interface BreadcrumbsPluginSettings {
  parentFieldName: string;
  siblingFieldName: string;
  childFieldName: string;
  indexNote: string;
}

const DEFAULT_SETTINGS: BreadcrumbsPluginSettings = {
  parentFieldName: "parent",
  siblingFieldName: "sibling",
  childFieldName: "child",
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

interface neighbourObj {
  current: string;
  parent: string[];
  sibling: string[];
  child: string[];
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
    const parentRegex = new RegExp(
      `.*?${parentFieldName}::? \\[\\[([^#\\|\\]]*)(#|\\|)?.*\\]\\][^\\]]*?`
    );

    const childParentArr: childParent[] = nameContentArr.map(
      (arr: nameContent) => {
        const match = arr.content.match(parentRegex);
        if (match) {
          // const parent = match[1].replace(/(.+)(#|\|).+/g, "$1");
          return { child: arr.fileName, parent: match[1] };
        } else {
          return { child: arr.fileName, parent: "" };
        }
      }
    );
    console.log(childParentArr);
    return childParentArr;
  }

  // Grab parent fields from note content
  getNeighbourArr(nameContentArr: nameContent[]) {
    // General use
    const splitLinksRegex = new RegExp(/\[\[(.+?)\]\]/g);
    const dropHeaderOrAlias = new RegExp(/\[\[([^#|]+)\]\]/);
    function splitAndDrop(str: string | undefined): string[] | [] {
      if (str === undefined || str === "") {
        return [];
      } else {
        return str
          .match(splitLinksRegex)
          .map((link) => link.match(dropHeaderOrAlias)[1]);
      }
    }

    // Regex to match the `parent` metadata field
    const parentField = this.settings.parentFieldName;
    const getParentLinksRegex = new RegExp(`.*?${parentField}::? ?(.*)`);

    // Regex to match the `child` metadata field
    const childField = this.settings.childFieldName;
    const getChildLinksRegex = new RegExp(`.*?${childField}::? ?(.*)`, "i");

    // Regex to match the `sibling` metadata field
    const siblingField = this.settings.siblingFieldName;
    const getSiblingLinksRegex = new RegExp(`.*?${siblingField}::? ?(.*)`, "i");

    const neighbourArr: neighbourObj[] = nameContentArr.map(
      (arr: nameContent) => {
        const parentLinks: string | undefined =
          arr.content.match(getParentLinksRegex)?.[1];
        const siblingLinks: string | undefined =
          arr.content.match(getSiblingLinksRegex)?.[1];
        const childLinks: string | undefined =
          arr.content.match(getChildLinksRegex)?.[1];

        console.log({current: arr.fileName, parentLinks, siblingLinks, childLinks})

        const [splitParentLinks, splitSiblingLinks, splitChildLinks] = [
          splitAndDrop(parentLinks),
          splitAndDrop(siblingLinks),
          splitAndDrop(childLinks),
        ];

        return {
          current: arr.fileName,
          parent: splitParentLinks,
          sibling: splitSiblingLinks,
          child: splitChildLinks,
        };
      }
    );
    console.log(neighbourArr);
    return neighbourArr;
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
        g.setEdge(edge.child, edge.parent, "parent");
      }
    });
    return g;
  }

  getBreadcrumbs(g: Graph) {
    const to = this.settings.indexNote;
    const from = this.app.workspace.getActiveFile().basename;
    const paths = graphlib.alg.dijkstra(g, from);
    let step = to;
    const breadcrumbs: string[] = [];

    console.log({ paths });
    if (paths[step].distance === Infinity) {
      return [
        `No path to ${this.settings.indexNote} was found from the current note`,
      ];
    } else {
      while (paths[step].distance !== 0) {
        breadcrumbs.push(step);
        step = paths[step].predecessor;
      }

      breadcrumbs.push(from);
      return breadcrumbs;
    }
  }

  async draw() {
    const g = await this.initialiseGraph(this.settings);
    console.log({ g });
    const crumbs = this.getBreadcrumbs(g);
    console.log({ crumbs });
    this.contentEl.empty();

    if (crumbs[0].includes("No path to")) {
      this.contentEl.createDiv({ text: crumbs[0] });
    } else {
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
  }

  async onOpen(): Promise<void> {
    await this.draw();
  }
}

export default class BreadcrumbsPlugin extends Plugin {
  settings: BreadcrumbsPluginSettings;
  plugin: BreadcrumbsPlugin;
  view: BreadcrumbsView;

  async onload(): Promise<void> {
    console.log("loading plugin");

    await this.loadSettings();

    this.addRibbonIcon("dice", "Breadcrumbs", async () => {
      console.log(
        this.view.getNeighbourArr(await this.view.getNameContentArr())
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

  // onunload(): Promise<void> {
  //   console.log("unloading plugin");
  // }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}

// class SampleModal extends Modal {
//   constructor(app: App) {
//     super(app);
//   }

//   onOpen() {
//     const { contentEl } = this;
//     contentEl.setText("Woah!");
//   }

//   onClose() {
//     const { contentEl } = this;
//     contentEl.empty();
//   }
// }
