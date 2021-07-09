import { reverse } from "dns";
import type { Graph } from "graphlib";
import { ItemView, TFile, WorkspaceLeaf } from "obsidian";
import {
  DATAVIEW_INDEX_DELAY,
  TRAIL_ICON,
  VIEW_TYPE_BREADCRUMBS_MATRIX
} from "src/constants";
import type { allGraphs, internalLinkObj, SquareProps } from "src/interfaces";
import type BreadcrumbsPlugin from "src/main";
import { closeImpliedLinks } from "src/sharedFunctions";
import Lists from "./Lists.svelte";
import Matrix from "./Matrix.svelte";

export default class MatrixView extends ItemView {
  private plugin: BreadcrumbsPlugin;
  private view: Matrix | Lists;
  private currGraphs: allGraphs;
  matrixQ: boolean;

  constructor(leaf: WorkspaceLeaf, plugin: BreadcrumbsPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  async onload(): Promise<void> {
    super.onload();
    await this.plugin.saveSettings();
    this.matrixQ = this.plugin.settings.defaultView;

    this.app.workspace.onLayoutReady(async () => {
      setTimeout(async () => await this.draw(), DATAVIEW_INDEX_DELAY);
    });
  }

  getViewType(): string {
    return VIEW_TYPE_BREADCRUMBS_MATRIX;
  }

  getDisplayText(): string {
    return "Breadcrumbs Matrix";
  }

  icon = TRAIL_ICON;

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

  resolvedClass(toFile: string, currFile: TFile): string {
    return this.app.metadataCache.unresolvedLinks[currFile.path][toFile] > 0
      ? "internal-link is-unresolved breadcrumbs-link"
      : "internal-link breadcrumbs-link";
  }

  // NOTE I should be able to check for duplicates in real and implied here
  squareItems(g: Graph, currFile: TFile, realQ = true): internalLinkObj[] {
    let items: string[];
    const successors = (g.successors(currFile.basename) ?? []) as string[];
    const predecessors = (g.predecessors(currFile.basename) ?? []) as string[];

    if (realQ) {
      items = successors;
    } else {
      items = predecessors;
    }
    const internalLinkObjArr: internalLinkObj[] = [];
    if (items.length) {
      items.forEach((item: string) => {
        internalLinkObjArr.push({
          to: item,
          cls: this.resolvedClass(item, currFile) + (realQ ? '' : ' breadcrumbs-implied'),
        });
      });
    }
    return internalLinkObjArr;
  }

  // ANCHOR Remove duplicate implied links

  removeDuplicateImplied(
    real: internalLinkObj[],
    implied: internalLinkObj[]
  ): void {
    const impliedTos: [string, number][] = implied.map((impliedObj, i) => [
      impliedObj.to,
      i,
    ]);
    real.forEach((realItem) => {
      impliedTos.forEach((impliedTo) => {
        if (impliedTo[0] === realItem.to) {
          implied.splice(impliedTo[1], 1);
        }
      });
    });
  }

  dfsAllPaths(g: Graph, startNode: string): string[][] {
    const queue: { node: string; path: string[] }[] = [
      { node: startNode, path: [] },
    ];
    const pathsArr: string[][] = [];

    let i = 0;
    while (queue.length > 0 && i < 1000) {
      i++
      const currPath = queue.shift();

      const newNodes = (g.successors(currPath.node) ?? []) as string[];
      const extPath = [currPath.node, ...currPath.path];
      queue.unshift(
        ...newNodes.map((n: string) => {
          return { node: n, path: extPath };
        })
      );

      if (newNodes.length === 0) {
        pathsArr.push(extPath);
      }
    }
    return pathsArr
  }


  async draw(): Promise<void> {
    this.contentEl.empty();
    // this.currGraphs = this.plugin.currGraphs;
    const { gParents, gSiblings, gChildren } = this.plugin.currGraphs;
    const currFile = this.app.workspace.getActiveFile();
    const settings = this.plugin.settings;

    // SECTION Create Index


    const allPaths = this.dfsAllPaths(closeImpliedLinks(gChildren, gParents), currFile.basename);
    const reversed = allPaths.map(path => path.reverse());
    reversed.forEach(path => path.shift());

    let txt = currFile.basename + '\n';
    const indent = '  ';
    reversed.forEach(path => {
      for (let i = 0; i < path.length; i++) {
        txt += indent.repeat(i + 1);
        txt += '- '
        txt += path[i];
        txt += '\n';
      }
    })


    // !SECTION Create Index

    const viewToggleButton = this.contentEl.createEl("button", {
      text: this.matrixQ ? "List" : "Matrix",
    });
    viewToggleButton.addEventListener("click", async () => {
      this.matrixQ = !this.matrixQ;
      viewToggleButton.innerText = this.matrixQ ? "List" : "Matrix";
      await this.draw();
    });

    const createIndexButton = this.contentEl.createEl("button", {
      text: "Create Index",
    });
    createIndexButton.addEventListener("click", () =>
      console.log(
        txt
      )
    );


    const [parentFieldName, siblingFieldName, childFieldName] = [
      settings.showNameOrType ? settings.parentFieldName : "Parent",
      settings.showNameOrType ? settings.siblingFieldName : "Sibling",
      settings.showNameOrType ? settings.childFieldName : "Child",
    ];


    const [
      realParents,
      realSiblings,
      realChildren,
      impliedParents,
      impliedChildren,
    ] = [
        this.squareItems(gParents, currFile),
        this.squareItems(gSiblings, currFile),
        this.squareItems(gChildren, currFile),
        this.squareItems(gChildren, currFile, false),
        this.squareItems(gParents, currFile, false),
      ];

    // SECTION Implied Siblings
    /// Notes with the same parents
    const currParents = (gParents.successors(currFile.basename) ??
      []) as string[];
    const impliedSiblingsArr: internalLinkObj[] = [];

    if (currParents.length) {
      currParents.forEach((parent) => {
        const impliedSiblings = (gParents.predecessors(parent) ??
          []) as string[];

        // The current note is always it's own implied sibling, so remove it from the list
        const indexCurrNote = impliedSiblings.indexOf(currFile.basename);
        impliedSiblings.splice(indexCurrNote, 1);

        // Create thie implied sibling SquareProps
        impliedSiblings.forEach((impliedSibling) => {
          impliedSiblingsArr.push({
            to: impliedSibling,
            cls: this.resolvedClass(impliedSibling, currFile),
          });
        });
      });
    }

    /// A real sibling implies the reverse sibling
    impliedSiblingsArr.push(...this.squareItems(gSiblings, currFile, false))


    // !SECTION

    this.removeDuplicateImplied(realParents, impliedParents);
    this.removeDuplicateImplied(realSiblings, impliedSiblingsArr);
    this.removeDuplicateImplied(realChildren, impliedChildren);

    const parentsSquare: SquareProps = {
      realItems: realParents,
      impliedItems: impliedParents,
      fieldName: parentFieldName,
    };

    const siblingSquare: SquareProps = {
      realItems: realSiblings,
      impliedItems: impliedSiblingsArr,
      fieldName: siblingFieldName,
    };

    const childrenSquare: SquareProps = {
      realItems: realChildren,
      impliedItems: impliedChildren,
      fieldName: childFieldName,
    };

    if (this.matrixQ) {
      this.view = new Matrix({
        target: this.contentEl,
        props: {
          parents: parentsSquare,
          siblings: siblingSquare,
          children: childrenSquare,
          currFile,
          settings: settings,
          matrixView: this,
          app: this.app
        },
      });
    } else {
      this.view = new Lists({
        target: this.contentEl,
        props: {
          parents: parentsSquare,
          siblings: siblingSquare,
          children: childrenSquare,
          currFile,
          settings: settings,
          matrixView: this,
          app: this.app
        },
      });
    }
  }
}
