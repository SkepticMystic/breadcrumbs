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
  parents: string[];
  siblings: string[];
  children: string[];
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
    // console.log(childParentArr);
    return childParentArr;
  }

  // General use
  splitLinksRegex = new RegExp(/\[\[(.+?)\]\]/g);
  dropHeaderOrAlias = new RegExp(/\[\[([^#|]+)\]\]/);
  splitAndDrop(str: string): string[] | [] {
    return str
      ?.match(this.splitLinksRegex)
      ?.map((link) => link.match(this.dropHeaderOrAlias)?.[1]);
  }

  getNeighbourArr(nameContentArr: nameContent[]) {
    // Regex to match the `parent` metadata field
    const parentField = this.settings.parentFieldName;
    const getParentLinksRegex = new RegExp(
      `.*?${parentField}::? ?(\\[\\[.*\\]\\])`
    );

    // Regex to match the `child` metadata field
    const childField = this.settings.childFieldName;
    const getChildLinksRegex = new RegExp(
      `.*?${childField}::? ?(\\[\\[.*\\]\\])`,
      "i"
    );

    // Regex to match the `sibling` metadata field
    const siblingField = this.settings.siblingFieldName;
    const getSiblingLinksRegex = new RegExp(
      `.*?${siblingField}::? ?(\\[\\[.*\\]\\])`,
      "i"
    );

    const neighbourArr: neighbourObj[] = nameContentArr.map((arr) => {
      const parentLinks = arr.content.match(getParentLinksRegex)?.[1];
      const siblingLinks = arr.content.match(getSiblingLinksRegex)?.[1];
      const childLinks = arr.content.match(getChildLinksRegex)?.[1];

      const [splitParentLinks, splitSiblingLinks, splitChildLinks] = [
        this.splitAndDrop(parentLinks) ?? [],
        this.splitAndDrop(siblingLinks) ?? [],
        this.splitAndDrop(childLinks) ?? [],
      ];

      const currentNeighbourObj: neighbourObj = {
        current: arr.fileName,
        parents: splitParentLinks,
        siblings: splitSiblingLinks,
        children: splitChildLinks,
      };

      // console.log(currentNeighbourObj);
      return currentNeighbourObj;
    });
    // console.log(neighbourArr);
    return neighbourArr;
  }

  // Graph stuff...
  async initialiseNeighbourGraph() {
    const nameContentArr = await this.getNameContentArr();
    const neighbourArr: neighbourObj[] = this.getNeighbourArr(nameContentArr);
    // const indexNote = this.settings.indexNote;

    // const gAllInOne = new Graph();
    const gParents = new Graph();
    const gSiblings = new Graph();
    const gChildren = new Graph();

    neighbourArr.forEach((neighbourObj) => {
      // gAllInOne.setNode(neighbourObj.current, neighbourObj.current);
      gParents.setNode(neighbourObj.current, neighbourObj.current);
      gSiblings.setNode(neighbourObj.current, neighbourObj.current);
      gChildren.setNode(neighbourObj.current, neighbourObj.current);

      neighbourObj.parents.forEach((parent) =>
        gParents.setEdge(neighbourObj.current, parent, "parent")
      );

      neighbourObj.siblings.forEach((sibling) =>
        gSiblings.setEdge(neighbourObj.current, sibling, "sibling")
      );

      neighbourObj.children.forEach((child) =>
        gChildren.setEdge(neighbourObj.current, child, "child")
      );
    });

    // neighbourArr.forEach((neighbourObj) => {
    //   gAllInOne.setNode(neighbourObj.current, neighbourObj.current);

    //   if (neighbourObj.parents.length > 0) {
    //     neighbourObj.parents.forEach((parent) =>
    //       gAllInOne.setEdge(neighbourObj.current, parent, "parent")
    //     );
    //   }

    //   if (neighbourObj.siblings.length > 0) {
    //     neighbourObj.siblings.forEach((sibling) =>
    //       gAllInOne.setEdge(neighbourObj.current, sibling, "sibling")
    //     );
    //   }

    //   if (neighbourObj.children.length > 0) {
    //     neighbourObj.children.forEach((child) =>
    //       gAllInOne.setEdge(neighbourObj.current, child, "child")
    //     );
    //   }
    // });

    return { gParents, gSiblings, gChildren };
  }

  // // Graph stuff...
  // async initialiseGraph(settings: BreadcrumbsPluginSettings) {
  //   const nameContentArr = await this.getNameContentArr();
  //   const childParentArr = this.getChildParentArr(nameContentArr, settings);
  //   const g = new Graph();
  //   const indexNote = settings.indexNote;
  //   g.setNode(indexNote, indexNote);

  //   childParentArr.forEach((edge) => {
  //     g.setNode(edge.child, edge.child);
  //     if (edge.parent !== "") {
  //       g.setEdge(edge.child, edge.parent, "parent");
  //     }
  //   });
  //   return g;
  // }

  getPaths(g: Graph, userTo: string = this.settings.indexNote) {
    const from = this.app.workspace.getActiveFile().basename;
    const paths = graphlib.alg.dijkstra(g, from);
    let step = userTo;
    const breadcrumbs: string[] = [];

    console.log({ paths });

    if (paths[step].distance === Infinity) {
      return [`No path to ${userTo} was found from the current note`];
    } else {
      while (paths[step].distance !== 0) {
        breadcrumbs.push(step);
        step = paths[step].predecessor;
      }

      breadcrumbs.push(from);
      return breadcrumbs;
    }
  }

  // getBreadcrumbs(g: Graph) {
  //   const to = this.settings.indexNote;
  //   const from = this.app.workspace.getActiveFile().basename;
  //   const paths = graphlib.alg.dijkstra(g, from);
  //   let step = to;
  //   const breadcrumbs: string[] = [];

  //   console.log({ paths });
  //   if (paths[step].distance === Infinity) {
  //     return [
  //       `No path to ${this.settings.indexNote} was found from the current note`,
  //     ];
  //   } else {
  //     while (paths[step].distance !== 0) {
  //       breadcrumbs.push(step);
  //       step = paths[step].predecessor;
  //     }

  //     breadcrumbs.push(from);
  //     return breadcrumbs;
  //   }
  // }

  makeInternalLinkInEl(
    el: HTMLSpanElement | HTMLDivElement,
    text: string,
    count: number = undefined
  ) {
    const innerDiv = el.createDiv();
    if (count) {
      innerDiv.createSpan({ text: `${count}. ` });
    }
    const link = innerDiv.createEl("a", {
      cls: "internal-link",
      text,
    });
    link.href = null;
    link.addEventListener("click", () => {
      this.app.workspace.openLinkText(
        text,
        this.app.workspace.getActiveFile().path
      );
    });
  }

  async draw() {
    const graphs = await this.initialiseNeighbourGraph();
    const { gParents, gSiblings, gChildren } = graphs;
    console.log({ graphs });
    // const g = await this.initialiseGraph(this.settings);
    // console.log({ g });
    const crumbs = this.getPaths(gParents);
    console.log({ crumbs });

    const currFile = this.app.workspace.getActiveFile();
    this.contentEl.empty();

    const matrix = this.contentEl.createDiv({ cls: "matrix" });

    const topRow = matrix.createDiv({ cls: "matrixRow topRow" });

    const fillerUpDiv = topRow.createDiv({ cls: "fillerDiv" });
    const upDiv = topRow.createDiv({
      cls: "up breadcrumbDiv",
      text: this.settings.parentFieldName,
    });

    const middleRow = matrix.createDiv({ cls: "matrixRow middleRow" });
    const leftDiv = middleRow.createDiv({
      cls: "left breadcrumbDiv",
      text: "Top",
    });
    const currDiv = middleRow.createDiv({
      cls: "curr breadcrumbDiv",
      text: "Current",
    });
    const rightDiv = middleRow.createDiv({
      cls: "right breadcrumbDiv",
      text: this.settings.siblingFieldName,
    });

    const bottomRow = matrix.createDiv({
      cls: "matrixRow bottomRow",
    });
    const fillerBottomDiv = bottomRow.createDiv({ cls: "fillerDiv" });
    const downDiv = bottomRow.createDiv({
      cls: "down breadcrumbDiv",
      text: this.settings.childFieldName,
    });

    // Breadcrum trail:
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
              this.app.workspace.openLinkText(crumb, currFile.path);
            });
            trailEl.createDiv({ text: " ^ " });
          });
        }
      );

      breadcrumbTrail.removeChild(breadcrumbTrail.lastChild);
    }

    // upDiv
    const parents: string[] = gParents.successors(currFile.basename) ?? [];
    parents.forEach((successor: string, i) => {
      this.makeInternalLinkInEl(upDiv, successor, i + 1);
    });

    // currDiv
    this.makeInternalLinkInEl(currDiv, currFile.basename);

    // leftDiv
    this.makeInternalLinkInEl(leftDiv, this.settings.indexNote);

    // rightDiv
    const siblings: string[] = gSiblings.successors(currFile.basename) ?? [];
    siblings.forEach((successor: string, i) => {
      this.makeInternalLinkInEl(rightDiv, successor, i + 1);
    });

    // bottomDiv
    const children: string[] = gChildren.successors(currFile.basename) ?? [];
    children.forEach((successor: string, i) => {
      this.makeInternalLinkInEl(downDiv, successor, i + 1);
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

  async onload(): Promise<void> {
    console.log("loading plugin");

    await this.loadSettings();

    this.addRibbonIcon("dice", "Breadcrumbs", async () => {
      console.log({
        neighbourArr: this.view.getNeighbourArr(
          await this.view.getNameContentArr()
        ),
        graph: await this.view.initialiseNeighbourGraph(),
      });
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
