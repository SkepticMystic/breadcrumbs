import {
  FrontMatterCache,
  ItemView,
  Plugin,
  TFile,
  WorkspaceLeaf,
} from "obsidian";
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

interface neighbourObj {
  current: TFile;
  parents: string[];
  siblings: string[];
  children: string[];
}

interface fileFrontmatter {
  file: TFile;
  frontmatter: FrontMatterCache;
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

  getFileFrontmatter(): fileFrontmatter[] {
    const files: TFile[] = this.app.vault.getMarkdownFiles();
    const fileObsDvArr: fileFrontmatter[] = [];

    if (this.app.plugins.plugins.dataview !== undefined) {
      files.forEach((tFile) => {
        const dv: FrontMatterCache = this.app.plugins.plugins.dataview.api.page(
          tFile.path
        );
        fileObsDvArr.push({ file: tFile, frontmatter: dv });
      });
    } else {
      files.forEach((tFile) => {
        const obs: FrontMatterCache =
          this.app.metadataCache.getFileCache(tFile).frontmatter;
        fileObsDvArr.push({
          file: tFile,
          frontmatter: obs,
        });
      });
    }
    return fileObsDvArr;
  }
  // General use
  splitLinksRegex = new RegExp(/\[\[(.+?)\]\]/g);
  dropHeaderOrAlias = new RegExp(/\[\[([^#|]+)\]\]/);

  splitAndDrop(str: string): string[] | [] {
    return str
      ?.match(this.splitLinksRegex)
      ?.map((link) => link.match(this.dropHeaderOrAlias)?.[1]);
  }

  getFields(obj: fileFrontmatter, field: string) {
    const fieldItems: string | [] = obj.frontmatter[field] ?? [];
    if (typeof fieldItems === "string") {
      return this.splitAndDrop(fieldItems);
    } else {
      return [fieldItems].flat().map((link) => link.path);
    }
  }

  getNeighbourObjArr(fileFrontmatterArr: fileFrontmatter[]): neighbourObj[] {
    return fileFrontmatterArr.map((obj) => {
      const parents = this.getFields(obj, this.settings.parentFieldName);
      const siblings = this.getFields(obj, this.settings.siblingFieldName);
      const children = this.getFields(obj, this.settings.childFieldName);

      return { current: obj.file, parents, siblings, children };
    });
  }

  // Graph stuff...
  async initialiseNeighbourGraph() {
    const fileFrontmatterArr = this.getFileFrontmatter();
    const neighbourArr = this.getNeighbourObjArr(fileFrontmatterArr);
    const [gParents, gSiblings, gChildren] = [
      new Graph(),
      new Graph(),
      new Graph(),
    ];

    neighbourArr.forEach((neighbourObj) => {
      const currFileName = neighbourObj.current.basename;
      gParents.setNode(currFileName, neighbourObj.current);
      gSiblings.setNode(currFileName, neighbourObj.current);
      gChildren.setNode(currFileName, neighbourObj.current);

      if (neighbourObj.parents) {
        neighbourObj.parents.forEach((parent) =>
          gParents.setEdge(currFileName, parent, "parent")
        );
      }
      if (neighbourObj.siblings) {
        neighbourObj.siblings.forEach((sibling) =>
          gSiblings.setEdge(currFileName, sibling, "sibling")
        );
      }
      if (neighbourObj.children) {
        neighbourObj.children.forEach((child) =>
          gChildren.setEdge(currFileName, child, "child")
        );
      }
    });

    return { gParents, gSiblings, gChildren };
  }

  getBreadcrumbs(g: Graph, userTo: string = this.settings.indexNote) {
    const from = this.app.workspace.getActiveFile().basename;
    const paths = graphlib.alg.dijkstra(g, from);
    let step = userTo;
    const breadcrumbs: string[] = [];

    // Check if a path even exists
    if (paths[step].distance === Infinity) {
      return [`No path to ${userTo} was found from the current note`];
    } else {
      // If it does, walk it until arriving at `from`
      while (paths[step].distance !== 0) {
        breadcrumbs.push(step);
        step = paths[step].predecessor;
      }

      breadcrumbs.push(from);
      return breadcrumbs;
    }
  }

  makeInternalLinkInEl(
    el: HTMLSpanElement | HTMLDivElement,
    text: string,
    currFile: TFile,
    count: number = undefined
  ) {
    const innerDiv = el.createDiv();
    if (count) {
      innerDiv.createSpan({ text: `${count}. ` });
    }

    // Check if link is resolved
    /// Doesn't seem to actually work
    const linkCls =
      this.app.metadataCache.unresolvedLinks[currFile.path][text] > 0
        ? "internal-link is-unresolved"
        : "internal-link";
    const link = innerDiv.createEl("a", {
      cls: linkCls,
      text,
    });
    link.href = null;
    link.addEventListener("click", () => {
      this.app.workspace.openLinkText(text, currFile.path);
    });
  }

  popMatrixSquareReal(g: Graph, currFile: TFile, div: HTMLDivElement) {
    const items: string[] = g.successors(currFile.basename) ?? [];
    if (items.length) {
      div.createDiv({ text: "Real" });
      items.forEach((item: string, i) => {
        this.makeInternalLinkInEl(div, item, currFile, i + 1);
      });
    }
  }

  popMatrixSquareImplied(g: Graph, currFile: TFile, div: HTMLDivElement) {
    const items: string[] = g.predecessors(currFile.basename) ?? [];
    if (items.length) {
      div.createDiv({ text: "Implied" });
      items.forEach((item: string, i) => {
        this.makeInternalLinkInEl(div, item, currFile, i + 1);
      });
    }
  }

  async draw() {
    const graphs = await this.initialiseNeighbourGraph();
    const { gParents, gSiblings, gChildren } = graphs;
    const crumbs = this.getBreadcrumbs(gParents);
    const currFile = this.app.workspace.getActiveFile();

    const headingLevel = "strong";

    this.contentEl.empty();

    const matrix = this.contentEl.createDiv({ cls: "breadcrumbs-grid" });

    matrix.createDiv({
      cls: "breadcrumbs-item-11 breadcrumbs-fillerDiv",
    });
    const upDiv = matrix.createDiv({
      cls: "breadcrumbs-item-12 breadcrumbsDiv markdown-preview-view",
    });
    upDiv.createEl(headingLevel, {
      text: this.settings.parentFieldName,
      cls: "breadcrumbs-heading",
    });
    matrix.createDiv({
      cls: "breadcrumbs-item-13 breadcrumbs-fillerDiv",
    });

    const leftDiv = matrix.createDiv({
      cls: "breadcrumbs-item-21 breadcrumbsDiv markdown-preview-view",
    });
    leftDiv.createEl(headingLevel, { text: "Top", cls: "breadcrumbs-heading" });
    const currDiv = matrix.createDiv({
      cls: "breadcrumbs-item-22 breadcrumbsDiv markdown-preview-view",
    });
    currDiv.createEl(headingLevel, {
      text: "Current",
      cls: "breadcrumbs-heading",
    });
    const rightDiv = matrix.createDiv({
      cls: "breadcrumbs-item-23 breadcrumbsDiv markdown-preview-view",
    });
    rightDiv.createEl(headingLevel, {
      text: this.settings.siblingFieldName,
      cls: "breadcrumbs-heading",
    });

    matrix.createDiv({
      cls: "breadcrumbs-item-31 breadcrumbs-fillerDiv",
    });
    const downDiv = matrix.createDiv({
      cls: "breadcrumbs-item-32 breadcrumbsDiv markdown-preview-view",
    });
    downDiv.createEl(headingLevel, {
      text: this.settings.childFieldName,
      cls: "breadcrumbs-heading",
    });
    matrix.createDiv({
      cls: "breadcrumbs-item-33 breadcrumbs-fillerDiv",
    });

    // upDiv
    this.popMatrixSquareReal(gParents, currFile, upDiv);
    this.popMatrixSquareImplied(gChildren, currFile, upDiv);

    // currDiv
    this.makeInternalLinkInEl(currDiv, currFile.basename, currFile);

    // leftDiv
    this.makeInternalLinkInEl(leftDiv, this.settings.indexNote, currFile);

    // rightDiv
    this.popMatrixSquareReal(gSiblings, currFile, rightDiv);

    /// Implied Siblings
    const currParents = gParents.successors(currFile.basename) ?? [];
    const indexCurrFile = currParents.indexOf(currFile.basename);
    let currParentsNotCurrFile = currParents;
    if (indexCurrFile >= 0) {
      currParentsNotCurrFile = currParents.splice(indexCurrFile, 1);
    }
    const impliedSiblings: string[] = [];
    if (currParentsNotCurrFile.length) {
      currParentsNotCurrFile.forEach((parent) =>
        impliedSiblings.push(gParents.predecessors(parent) ?? [])
      );
    }
    const flatImpliedSiblings = impliedSiblings.flat();
    if (flatImpliedSiblings.length) {
      rightDiv.createDiv({ text: "Implied" });
      flatImpliedSiblings.forEach((item: string, i) => {
        this.makeInternalLinkInEl(rightDiv, item, currFile, i + 1);
      });
    }

    // downDiv
    this.popMatrixSquareReal(gChildren, currFile, downDiv);
    this.popMatrixSquareImplied(gParents, currFile, downDiv);

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
        fileObsDv: this.view.getFileFrontmatter(),
        userFields: this.view.getNeighbourObjArr(
          this.view.getFileFrontmatter()
        ),
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
    this.app.workspace.getRightLeaf(false).setViewState({
      type: VIEW_TYPE_BREADCRUMBS,
    });
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
