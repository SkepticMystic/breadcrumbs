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
  private matrix: Matrix;

  constructor(leaf: WorkspaceLeaf, plugin: BreadcrumbsPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", async () => await this.draw())
    );
  }

  onload(): void {
    super.onload();
  }

  getViewType(): string {
    return VIEW_TYPE_BREADCRUMBS_MATRIX;
  }

  getDisplayText(): string {
    return "Breadcrumbs Matrix";
  }

  onClose(): Promise<void> {
    if (this.matrix) {
      this.matrix.$destroy();
    }
    return Promise.resolve();
  }

  getFileFrontmatterArr(): fileFrontmatter[] {
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
    return fileFrontmatterArr.map((fileFrontmatter) => {
      const parents = this.getFields(fileFrontmatter, "yz-parent");
      const siblings = this.getFields(fileFrontmatter, "sibling");
      const children = this.getFields(fileFrontmatter, "child");

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
    userTo: string = "Index"
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

    // const { parentFieldName, siblingFieldName, childFieldName, indexNote } =
    //   this.plugin.settings;

    const { gParents, gSiblings, gChildren } = await this.initGraphs();

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
      this.squareItems(gParents, false),
      this.squareItems(gChildren, false),
    ];

    // TODO finish
    const impliedSiblings = [];

    const currFile = this.app.workspace.getActiveFile();

    const parentsSquare: SquareProps = {
      realItems: realParents,
      impliedItems: impliedParents,
      fieldName: "parent",
      app: this.app,
    };

    const topSquare: SquareProps = {
      realItems: [
        {
          to: "Index",
          currFile: currFile,
          cls: this.resolvedClass("Index", currFile),
        },
      ],
      impliedItems: [{ to: undefined, currFile: undefined, cls: undefined }],
      fieldName: "Top",
      app: this.app,
    };

    const currSquare: SquareProps = {
      realItems: [
        {
          to: currFile.basename,
          currFile: currFile,
          cls: this.resolvedClass(currFile.basename, currFile),
        },
      ],
      impliedItems: [{ to: undefined, currFile: undefined, cls: undefined }],
      fieldName: "Current",
      app: this.app,
    };

    const siblingSquare: SquareProps = {
      realItems: realSiblings,
      impliedItems: impliedSiblings,
      fieldName: "sibling",
      app: this.app,
    };

    const childrenSquare: SquareProps = {
      realItems: realChildren,
      impliedItems: impliedChildren,
      fieldName: "child",
      app: this.app,
    };

    this.matrix = new Matrix({
      target: this.contentEl,
      props: {
        parents: parentsSquare,
        top: topSquare,
        current: currSquare,
        siblings: siblingSquare,
        children: childrenSquare,
      },
    });
  }

  async onOpen(): Promise<void> {
    // Liam uses this here: https://github.com/liamcain/obsidian-calendar-plugin/blob/d620bbac628ac8ac5e1f176ac1bb7be64dc2846e/src/view.ts#L100
    // this.app.workspace.trigger(TRIGGER_ON_OPEN, sources);
    // this.draw();
  }
}
