import * as graphlib from "graphlib";
import { Graph } from "graphlib";
import {
  App,
  FrontMatterCache,
  ItemView,
  TFile,
  WorkspaceLeaf,
} from "obsidian";
import {
  dropHeaderOrAlias,
  splitLinksRegex,
  VIEW_TYPE_BREADCRUMBS_MATRIX,
} from "src/constants";
import type BreadcrumbsPlugin from "src/main";
import Lists from "./Lists.svelte";
import Matrix from "./Matrix.svelte";

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

export interface internalLinkObj {
  to: string;
  currFile: TFile;
  cls: "internal-link is-unresolved" | "internal-link";
}

export interface SquareProps {
  realItems: internalLinkObj[];
  impliedItems: internalLinkObj[];
  fieldName: string;
  app: App;
}

export default class MatrixView extends ItemView {
  private plugin: BreadcrumbsPlugin;
  private view: Matrix;
  matrixQ: boolean;
  trailDiv: HTMLDivElement;
  previewView: HTMLElement;

  constructor(leaf: WorkspaceLeaf, plugin: BreadcrumbsPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", async () => {
        this.app.workspace.onLayoutReady(async () => {
          await this.draw();
        });
      })
    );
  }

  async onload(): Promise<void> {
    super.onload();
    await this.plugin.saveSettings();

    this.trailDiv = createDiv();
    this.trailDiv.classList.add("is-readable-line-width");
    setTimeout(
      () =>
        this.app.workspace.onLayoutReady(async () => {
          await this.draw();
        }),
      4000
    );
  }

  getViewType(): string {
    return VIEW_TYPE_BREADCRUMBS_MATRIX;
  }

  getDisplayText(): string {
    return "Breadcrumbs Matrix";
  }

  async onOpen(): Promise<void> {
    await this.plugin.saveSettings();
    this.app.workspace.onLayoutReady(async () => {
      await this.draw();
    });
  }

  onClose(): Promise<void> {
    if (this.view) {
      this.view.$destroy();
    }
    this.trailDiv.empty();
    return Promise.resolve();
  }

  getFileFrontmatterArr(): fileFrontmatter[] {
    const files: TFile[] = this.app.vault.getMarkdownFiles();
    const fileFrontMatterArr: fileFrontmatter[] = [];

    if (this.app.plugins.plugins.dataview !== undefined) {
      this.app.workspace.onLayoutReady(() => {
        files.forEach((file) => {
          const dv: FrontMatterCache =
            this.app.plugins.plugins.dataview.api.page(file.path);
          fileFrontMatterArr.push({ file, frontmatter: dv });
        });
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

  splitAndDrop(str: string): string[] | [] {
    return str
      ?.match(splitLinksRegex)
      ?.map((link) => link.match(dropHeaderOrAlias)?.[1]);
  }

  getFields(fileFrontmatter: fileFrontmatter, field: string): string[] {
    const fieldItems: string | [] = fileFrontmatter.frontmatter[field] ?? [];
    if (typeof fieldItems === "string") {
      return this.splitAndDrop(fieldItems);
    } else {
      return [fieldItems].flat().map((link) => link.path);
    }
  }

  getNeighbourObjArr(fileFrontmatterArr: fileFrontmatter[]): neighbourObj[] {
    const settings = this.plugin.settings;
    return fileFrontmatterArr.map((fileFrontmatter) => {
      const parents = this.getFields(fileFrontmatter, settings.parentFieldName);
      const siblings = this.getFields(
        fileFrontmatter,
        settings.siblingFieldName
      );
      const children = this.getFields(fileFrontmatter, settings.childFieldName);

      return { current: fileFrontmatter.file, parents, siblings, children };
    });
  }

  populateGraph(
    g: Graph,
    currFileName: string,
    neighbourObj: neighbourObj,
    relationship: string
  ): void {
    if (neighbourObj[relationship]) {
      g.setNode(currFileName, currFileName);
      neighbourObj[relationship].forEach((node) =>
        g.setEdge(currFileName, node, relationship)
      );
    }
  }

  async initGraphs(): Promise<{
    gParents: Graph;
    gSiblings: Graph;
    gChildren: Graph;
  }> {
    const fileFrontmatterArr = this.getFileFrontmatterArr();
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

  //   This is a TrailView thing
  getBreadcrumbs(
    g: Graph,
    // TODO Settings bug
    userTo: string = this.plugin.settings.indexNote
  ): string[] {
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

  //   Need to adjust this to return the link El instead of appending it to a specified el
  resolvedClass(
    toFile: string,
    currFile: TFile
  ): "internal-link is-unresolved" | "internal-link" {
    return this.app.metadataCache.unresolvedLinks[currFile.path][toFile] > 0
      ? "internal-link is-unresolved"
      : "internal-link";
  }

  squareItems(g: Graph, realQ = true): internalLinkObj[] {
    const currFile = this.app.workspace.getActiveFile();
    let items: string[];
    if (realQ) {
      items = g.successors(currFile.basename) ?? [];
    } else {
      items = g.predecessors(currFile.basename) ?? [];
    }
    const internalLinkObjArr: internalLinkObj[] = [];
    if (items.length) {
      items.forEach((item: string) => {
        internalLinkObjArr.push({
          to: item,
          currFile: currFile,
          cls: this.resolvedClass(item, currFile),
        });
      });
    }
    return internalLinkObjArr;
  }

  async draw(): Promise<void> {
    this.contentEl.empty();

    const { gParents, gSiblings, gChildren } = await this.initGraphs();
    const breadcrumbs = this.getBreadcrumbs(gParents);
    const currFile = this.app.workspace.getActiveFile();
    const settings = this.plugin.settings;

    this.previewView = document.querySelector(
      "div.mod-active div.view-content div.markdown-preview-view"
    );
    this.previewView.prepend(this.trailDiv);

    this.trailDiv.empty();

    breadcrumbs.forEach((crumb) => {
      const link = this.trailDiv.createEl("a", { text: crumb });
      link.href = null;
      link.classList.add(...this.resolvedClass(crumb, currFile).split(" "));
      link.addEventListener("click", async () => {
        await this.app.workspace.openLinkText(crumb, currFile.path);
      });
      this.trailDiv.createSpan({ text: ` ${settings.trailSeperator} ` });
    });

    this.trailDiv.removeChild(this.trailDiv.lastChild);

    // this.trailDiv.innerText = breadcrumbs.join(" > ");

    const button = this.contentEl.createEl("button", {
      text: this.matrixQ ? "List" : "Matrix",
    });
    button.addEventListener("click", async () => {
      this.matrixQ = !this.matrixQ;
      button.innerText = this.matrixQ ? "List" : "Matrix";
      await this.draw();
    });

    // const { parentFieldName, siblingFieldName, childFieldName, indexNote } =
    //   this.plugin.settings;

    const [
      realParents,
      realSiblings,
      realChildren,
      impliedParents,
      impliedChildren,
    ] = [
      this.squareItems(gParents),
      this.squareItems(gSiblings),
      this.squareItems(gChildren),
      this.squareItems(gChildren, false),
      this.squareItems(gParents, false),
    ];


    /// Implied Siblings
    const currParents = gParents.successors(currFile.basename) ?? [];
    const impliedSiblingsArr: internalLinkObj[] = [];

    if (currParents.length) {
      currParents.forEach((parent) => {
        const impliedSiblings = gParents.predecessors(parent) ?? [];
        const indexCurrNote = impliedSiblings.indexOf(currFile.basename);

        impliedSiblings.splice(indexCurrNote, 1);
        impliedSiblings.forEach((impliedSibling) => {
          impliedSiblingsArr.push({
            to: impliedSibling,
            currFile,
            cls: this.resolvedClass(impliedSibling, currFile),
          });
        });
      });
    }

    const parentsSquare: SquareProps = {
      realItems: realParents,
      impliedItems: impliedParents,
      fieldName: settings.parentFieldName,
      app: this.app,
    };

    const siblingSquare: SquareProps = {
      realItems: realSiblings,
      impliedItems: impliedSiblingsArr,
      fieldName: settings.siblingFieldName,
      app: this.app,
    };

    const childrenSquare: SquareProps = {
      realItems: realChildren,
      impliedItems: impliedChildren,
      fieldName: settings.childFieldName,
      app: this.app,
    };

    if (this.matrixQ) {
      this.view = new Matrix({
        target: this.contentEl,
        props: {
          parents: parentsSquare,
          siblings: siblingSquare,
          children: childrenSquare,
          settings: settings,
        },
      });
    } else {
      this.view = new Lists({
        target: this.contentEl,
        props: {
          parents: parentsSquare,
          siblings: siblingSquare,
          children: childrenSquare,
          settings: settings,
        },
      });
    }
  }
}
