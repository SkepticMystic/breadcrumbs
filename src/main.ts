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

const VIEW_TYPE_BREADCRUMBS_TRAIL = "breadcrumbs-trail";

class BreadcrumbsTrailView extends ItemView {
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
    return VIEW_TYPE_BREADCRUMBS_TRAIL;
  }

  getDisplayText(): string {
    return "Breadcrumbs Trail";
  }
}

const VIEW_TYPE_BREADCRUMBS_MATRIX = "breadcrumbs-matrix";
class BreadcrumbsMatrixView extends ItemView {
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
    return VIEW_TYPE_BREADCRUMBS_MATRIX;
  }

  getDisplayText(): string {
    return "Breadcrumbs Matrix";
  }

  getFileFrontmatter(): fileFrontmatter[] {
    const files: TFile[] = this.app.vault.getMarkdownFiles();
    const fileFrontMatterArr: fileFrontmatter[] = [];

    if (this.app.plugins.plugins.dataview !== undefined) {
      files.forEach((file) => {
        const dv: FrontMatterCache = this.app.plugins.plugins.dataview.api.page(
          file.path
        );
        fileFrontMatterArr.push({ file, frontmatter: dv });
      });
    } else {
      files.forEach((file) => {
        const obs: FrontMatterCache =
          this.app.metadataCache.getFileCache(file).frontmatter;
        fileFrontMatterArr.push({
          file,
          frontmatter: obs,
        });
      });
    }
    return fileFrontMatterArr;
  }

  // General use
  splitLinksRegex = new RegExp(/\[\[(.+?)\]\]/g);
  dropHeaderOrAlias = new RegExp(/\[\[([^#|]+)\]\]/);

  splitAndDrop(str: string): string[] | [] {
    return str
      ?.match(this.splitLinksRegex)
      ?.map((link) => link.match(this.dropHeaderOrAlias)?.[1]);
  }

  getFields(fileFrontmatter: fileFrontmatter, field: string) {
    const fieldItems: string | [] = fileFrontmatter.frontmatter[field] ?? [];
    if (typeof fieldItems === "string") {
      return this.splitAndDrop(fieldItems);
    } else {
      return [fieldItems].flat().map((link) => link.path);
    }
  }

  getNeighbourObjArr(fileFrontmatterArr: fileFrontmatter[]): neighbourObj[] {
    return fileFrontmatterArr.map((fileFrontmatter) => {
      const parents = this.getFields(
        fileFrontmatter,
        this.settings.parentFieldName
      );
      const siblings = this.getFields(
        fileFrontmatter,
        this.settings.siblingFieldName
      );
      const children = this.getFields(
        fileFrontmatter,
        this.settings.childFieldName
      );

      return { current: fileFrontmatter.file, parents, siblings, children };
    });
  }

  populateGraph(
    g: Graph,
    currFileName: string,
    neighbourObj: neighbourObj,
    relationship: string
  ) {
    if (neighbourObj[relationship]) {
      g.setNode(currFileName, currFileName);
      neighbourObj[relationship].forEach((node) =>
        g.setEdge(currFileName, node, relationship)
      );
    }
  }
  // Graph stuff...
  async initialiseGraphs() {
    const fileFrontmatterArr = this.getFileFrontmatter();
    const neighbourArr = this.getNeighbourObjArr(fileFrontmatterArr);
    const [gParents, gSiblings, gChildren] = [
      new Graph(),
      new Graph(),
      new Graph(),
    ];

    neighbourArr.forEach((neighbourObj) => {
      const currFileName = neighbourObj.current.basename;

      this.populateGraph(gParents, currFileName, neighbourObj, "parents");
      this.populateGraph(gSiblings, currFileName, neighbourObj, "siblings");
      this.populateGraph(gChildren, currFileName, neighbourObj, "children");
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
    const graphs = await this.initialiseGraphs();
    const { gParents, gSiblings, gChildren } = graphs;
    const crumbs = this.getBreadcrumbs(gParents);
    const currFile = this.app.workspace.getActiveFile();

    const headingLevel = "strong";

    this.contentEl.empty();

    const matrix = this.contentEl.createDiv({ cls: "breadcrumbs-grid" });

    // ANCHOR Top row
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

    // ANCHOR Middle row
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

    // ANCHOR Bottom row
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
    // console.log(currParents);
    const impliedSiblingsArr: string[] = [];
    if (currParents.length) {
      currParents.forEach((parent) => {
        const impliedSiblings = gParents.predecessors(parent) ?? [];
        const indexCurrNote = impliedSiblings.indexOf(currFile.basename);
        impliedSiblings.splice(indexCurrNote, 1);
        impliedSiblingsArr.push(impliedSiblings);
      });
    }
    const flatImpliedSiblings = impliedSiblingsArr.flat();
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
            this.makeInternalLinkInEl(trailEl, crumb, currFile);
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
  view: BreadcrumbsMatrixView;

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
            this.app.workspace.getLeavesOfType(VIEW_TYPE_BREADCRUMBS_MATRIX)
              .length === 0
          );
        }
        this.initLeaf();
      },
    });

    if (this.app.workspace.layoutReady) {
      this.initView();
    } else {
      this.registerEvent(this.app.workspace.on("layout-ready", this.initView));
    }

    this.addSettingTab(new BreadcrumbsSettingTab(this.app, this));

    this.registerView(VIEW_TYPE_BREADCRUMBS_MATRIX, (leaf: WorkspaceLeaf) => {
      return (this.view = new BreadcrumbsMatrixView(
        leaf,
        this.plugin,
        this.settings
      ));
    });
  }

  initView = async (): Promise<void> => {
    let leaf: WorkspaceLeaf = null;
    for (leaf of this.app.workspace.getLeavesOfType(
      VIEW_TYPE_BREADCRUMBS_MATRIX
    )) {
      if (leaf.view instanceof BreadcrumbsMatrixView) return;
      await leaf.setViewState({ type: "empty" });
      break;
    }
    (leaf ?? this.app.workspace.getRightLeaf(false)).setViewState({
      type: VIEW_TYPE_BREADCRUMBS_MATRIX,
      active: true,
    });
  };

  initLeaf(): void {
    this.app.workspace.getRightLeaf(false).setViewState({
      type: VIEW_TYPE_BREADCRUMBS_MATRIX,
      state: { file: this.app.workspace.getLeaf() },
    });
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
