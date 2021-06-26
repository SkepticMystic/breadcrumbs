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
  cls:
    | "internal-link is-unresolved breadcrumbs-link"
    | "internal-link breadcrumbs-link";
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
    this.matrixQ = true;
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
          this.app.metadataCache.getFileCache(file).frontmatter ?? [];
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
      return [fieldItems].flat().map((link) => link?.path ?? link);
    }
  }

  getNeighbourObjArr(fileFrontmatterArr: fileFrontmatter[]): neighbourObj[] {
    const settings = this.plugin.settings;
    const parentFields = settings.parentFieldName
      .split(",")
      .map((str) => str.trim());
    const siblingFields = settings.siblingFieldName
      .split(",")
      .map((str) => str.trim());
    const childFields = settings.childFieldName
      .split(",")
      .map((str) => str.trim());

    const neighbourObjArr: neighbourObj[] = fileFrontmatterArr.map(
      (fileFrontmatter) => {
        const parents = parentFields
          .map((parentField) => this.getFields(fileFrontmatter, parentField))
          .flat();
        const siblings = siblingFields
          .map((siblingField) => this.getFields(fileFrontmatter, siblingField))
          .flat();
        const children = childFields
          .map((childField) => this.getFields(fileFrontmatter, childField))
          .flat();
        return { current: fileFrontmatter.file, parents, siblings, children };
      }
    );
    return neighbourObjArr;
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

  resolvedClass(
    toFile: string,
    currFile: TFile
  ):
    | "internal-link is-unresolved breadcrumbs-link"
    | "internal-link breadcrumbs-link" {
    return this.app.metadataCache.unresolvedLinks[currFile.path][toFile] > 0
      ? "internal-link is-unresolved breadcrumbs-link"
      : "internal-link breadcrumbs-link";
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
    const currFile = this.app.workspace.getActiveFile();
    const settings = this.plugin.settings;

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

        // The current note is always it's own implied sibling, so remove it from the list
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
