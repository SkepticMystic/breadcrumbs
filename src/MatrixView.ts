import type Graph from "graphology";
import type { MultiGraph } from "graphology";
import { cloneDeep } from "lodash";
import { ItemView, TFile, WorkspaceLeaf } from "obsidian";
import {
  blankDirUndef,
  DIRECTIONS,
  MATRIX_VIEW,
  TRAIL_ICON,
} from "src/constants";
import type {
  BCSettings,
  Directions,
  internalLinkObj,
  userHierarchy,
} from "src/interfaces";
import type BCPlugin from "src/main";
import {
  copy,
  debug,
  debugGroupEnd,
  debugGroupStart,
  getInNeighbours,
  getOppDir,
  getOutNeighbours,
  getPrevNext,
  getSinks,
  linkClass,
  makeWiki,
  mergeGs,
} from "src/sharedFunctions";
import Lists from "./Components/Lists.svelte";
import Matrix from "./Components/Matrix.svelte";

export default class MatrixView extends ItemView {
  private plugin: BCPlugin;
  private view: Matrix | Lists;
  matrixQ: boolean;

  constructor(leaf: WorkspaceLeaf, plugin: BCPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  async onload(): Promise<void> {
    super.onload();
    this.matrixQ = this.plugin.settings.defaultView;

    this.app.workspace.onLayoutReady(async () => {
      setTimeout(
        async () => await this.draw(),
        this.app.plugins.plugins.dataview
          ? this.app.plugins.plugins.dataview.api
            ? 1
            : this.plugin.settings.dvWaitTime
          : 3000
      );
    });

    this.plugin.addCommand({
      id: "local-index",
      name: "Copy a Local Index to the clipboard",
      callback: async () => {
        const { settings } = this.plugin;
        const currFile = this.app.workspace.getActiveFile().basename;

        const closedParents = this.plugin.currGraphs.closedGs.down;

        const allPaths = this.dfsAllPaths(closedParents, currFile);
        const index = this.createIndex(currFile + "\n", allPaths, settings);
        debug(settings, { index });
        await copy(index);
      },
    });

    this.plugin.addCommand({
      id: "global-index",
      name: "Copy a Global Index to the clipboard",
      callback: async () => {
        const { up } = this.plugin.currGraphs.mergedGs;
        const closedParents = this.plugin.currGraphs.closedGs.down;

        const sinks = getSinks(up);
        const { settings } = this.plugin;

        let globalIndex = "";
        sinks.forEach((terminal) => {
          globalIndex += terminal + "\n";
          const allPaths = this.dfsAllPaths(closedParents, terminal);
          globalIndex = this.createIndex(globalIndex, allPaths, settings);
        });

        debug(settings, { globalIndex });
        await copy(globalIndex);
      },
    });
  }

  getViewType() {
    return MATRIX_VIEW;
  }
  getDisplayText() {
    return "Breadcrumbs Matrix";
  }

  icon = TRAIL_ICON;

  async onOpen(): Promise<void> {}

  onClose(): Promise<void> {
    this.view?.$destroy();
    return Promise.resolve();
  }

  getSquares(
    g: MultiGraph,
    currNode: string,
    fieldName: string,
    settings: BCSettings,
    realQ = true
  ) {
    const items = realQ
      ? g.filterOutNeighbors(
          currNode,
          (n) => g.getNodeAttribute(n, "fieldName") === fieldName
        )
      : g.filterInNeighbors(
          currNode,
          (n) => g.getNodeAttribute(n, "fieldName") === fieldName
        );

    return items.map((to: string) => {
      return {
        to,
        cls: linkClass(this.app, to, realQ),
        alt: this.getAlt(to, settings),
      };
    });
  }

  getAlt(node: string, settings: BCSettings) {
    let alt = null;
    if (settings.altLinkFields.length) {
      const toFile = this.app.metadataCache.getFirstLinkpathDest(node, "");
      if (toFile) {
        const metadata = this.app.metadataCache.getFileCache(toFile);
        settings.altLinkFields.forEach((altLinkField) => {
          alt = metadata?.frontmatter?.[altLinkField];
        });
      }
    }
    return alt;
  }

  squareItems(
    g: Graph,
    currFile: TFile,
    settings: BCSettings,
    realQ = true
  ): internalLinkObj[] {
    const items = realQ
      ? getOutNeighbours(g, currFile.basename)
      : getInNeighbours(g, currFile.basename);

    const internalLinkObjArr: internalLinkObj[] = [];

    items.forEach((to: string) => {
      internalLinkObjArr.push({
        to,
        cls: linkClass(this.app, to, realQ),
        alt: this.getAlt(to, settings),
        order: this.getOrder(to),
      });
    });

    return internalLinkObjArr;
  }

  // ANCHOR Remove duplicate implied links

  removeDuplicateImplied(
    reals: internalLinkObj[],
    implieds: internalLinkObj[]
  ): internalLinkObj[] {
    const realTos = reals.map((real) => real.to);
    return implieds.filter((implied) => !realTos.includes(implied.to));
  }

  dfsAllPaths(g: Graph, startNode: string): string[][] {
    const queue: { node: string; path: string[] }[] = [
      { node: startNode, path: [] },
    ];
    const pathsArr: string[][] = [];

    let i = 0;
    while (queue.length > 0 && i < 1000) {
      i++;
      const { node, path } = queue.shift();

      const extPath = [node, ...path];
      queue.unshift(
        ...g.mapOutNeighbors(node, (n: string) => {
          return { node: n, path: extPath };
        })
      );

      if (!g.outDegree(node)) pathsArr.push(extPath);
    }
    return pathsArr;
  }

  createIndex(
    index: string,
    allPaths: string[][],
    settings: BCSettings
  ): string {
    const { wikilinkIndex } = settings;
    const copy = cloneDeep(allPaths);
    const reversed = copy.map((path) => path.reverse());
    reversed.forEach((path) => path.shift());

    const indent = "  ";

    const visited: {
      [node: string]: /** The depths at which `node` was visited */ number[];
    } = {};

    reversed.forEach((path) => {
      for (let depth = 0; depth < path.length; depth++) {
        const currNode = path[depth];

        // If that node has been visited before at the current depth
        if (
          visited.hasOwnProperty(currNode) &&
          visited[currNode].includes(depth)
        ) {
          continue;
        } else {
          index += `${indent.repeat(depth)}- ${makeWiki(
            wikilinkIndex,
            currNode
          )}`;

          if (settings.aliasesInIndex) {
            const currFile = this.app.metadataCache.getFirstLinkpathDest(
              currNode,
              ""
            );

            if (currFile !== null) {
              const cache = this.app.metadataCache.getFileCache(currFile);

              const alias = cache?.frontmatter?.alias ?? [];
              const aliases = cache?.frontmatter?.aliases ?? [];

              const allAliases: string[] = [
                ...[alias].flat(3),
                ...[aliases].flat(3),
              ];
              if (allAliases.length) {
                index += ` (${allAliases.join(", ")})`;
              }
            }
          }

          index += "\n";

          if (!visited.hasOwnProperty(currNode)) visited[currNode] = [];
          visited[currNode].push(depth);
        }
      }
    });
    return index;
  }

  getOrder = (node: string) =>
    Number.parseInt(
      this.plugin.currGraphs.main.getNodeAttribute(node, "order")
    );

  getHierSquares(
    userHierarchies: userHierarchy[],
    data: { [dir in Directions]: Graph }[],
    currFile: TFile,
    settings: BCSettings
  ) {
    const { basename } = currFile;
    const {
      iNext: iNextInfo,
      iPrev: iPrevInfo,
      rNext: rNextInfo,
      rPrev: rPrevInfo,
    } = getPrevNext(this.plugin, basename);
    return userHierarchies.map((hier, i) => {
      const { up, same, down } = data[i];

      let [rUp, rSame, rDown, iUp, iDown] = [
        this.squareItems(up, currFile, settings),
        this.squareItems(same, currFile, settings),
        this.squareItems(down, currFile, settings),
        this.squareItems(down, currFile, settings, false),
        this.squareItems(up, currFile, settings, false),
      ];

      // SECTION Implied Siblings
      /// Notes with the same parents

      let iSameArr: internalLinkObj[] = [];
      const currParents = getOutNeighbours(up, basename);

      currParents.forEach((parent) => {
        let impliedSiblings = getInNeighbours(up, parent);

        // The current note is always it's own implied sibling, so remove it from the list
        const indexCurrNote = impliedSiblings.indexOf(basename);
        impliedSiblings.splice(indexCurrNote, 1);

        if (settings.filterImpliedSiblingsOfDifferentTypes) {
          const currNodeType: string = up.getNodeAttribute(
            basename,
            "fieldName"
          );
          impliedSiblings = impliedSiblings.filter((iSibling) => {
            const iSiblingType: string = up.getNodeAttribute(
              iSibling,
              "fieldName"
            );
            return iSiblingType === currNodeType;
          });
        }

        // Create the implied sibling SquareProps
        impliedSiblings.forEach((impliedSibling) => {
          iSameArr.push({
            to: impliedSibling,
            cls: linkClass(this.app, impliedSibling, false),
            alt: this.getAlt(impliedSibling, settings),
            order: this.getOrder(impliedSibling),
          });
        });
      });

      /// A real sibling implies the reverse sibling
      iSameArr.push(...this.squareItems(same, currFile, settings, false));

      // !SECTION

      let [iNext, iPrev, rNext, rPrev]: internalLinkObj[][] = [
        iNextInfo,
        iPrevInfo,
        rNextInfo,
        rPrevInfo,
      ].map((info) => {
        return info
          .filter(
            (item) =>
              hier.next.includes(item.fieldName) ||
              hier.prev.includes(item.fieldName)
          )
          .map((item) => {
            const { to } = item;
            return {
              to,
              cls: linkClass(this.app, to, item.real),
              alt: this.getAlt(to, settings),
              order: this.getOrder(to),
            };
          });
      });

      iUp = this.removeDuplicateImplied(rUp, iUp);
      iSameArr = this.removeDuplicateImplied(rSame, iSameArr);
      iDown = this.removeDuplicateImplied(rDown, iDown);
      iNext = this.removeDuplicateImplied(rNext, iNext);
      iPrev = this.removeDuplicateImplied(rPrev, iPrev);

      const iSameNoDup: internalLinkObj[] = [];
      iSameArr.forEach((impSib) => {
        if (iSameNoDup.every((noDup) => noDup.to !== impSib.to)) {
          iSameNoDup.push(impSib);
        }
      });
      iSameArr = iSameNoDup;

      const getFieldName = (dir: Directions) => {
        if (hier[dir] === undefined) return "";
        return hier[dir][0] === ""
          ? `${hier[getOppDir(dir)].join(",")}<${dir}]>`
          : hier[dir].join(", ");
      };

      [
        rUp,
        rSame,
        rDown,
        rNext,
        rPrev,
        iUp,
        iSameArr,
        iDown,
        iNext,
        iPrev,
      ].forEach((a) => a.sort((a, b) => a.order - b.order));

      return [
        {
          realItems: rUp,
          impliedItems: iUp,
          fieldName: getFieldName("up"),
        },

        {
          realItems: rSame,
          impliedItems: iSameArr,
          fieldName: getFieldName("same"),
        },

        {
          realItems: rDown,
          impliedItems: iDown,
          fieldName: getFieldName("down"),
        },
        {
          realItems: rNext,
          impliedItems: iNext,
          fieldName: getFieldName("next"),
        },
        {
          realItems: rPrev,
          impliedItems: iPrev,
          fieldName: getFieldName("prev"),
        },
      ];
    });
  }

  async draw(): Promise<void> {
    const { contentEl } = this;
    contentEl.empty();
    const { settings, currGraphs } = this.plugin;

    debugGroupStart(settings, "debugMode", "Draw Matrix/List View");

    const { userHierarchies } = settings;
    const currFile = this.app.workspace.getActiveFile();

    contentEl.createEl(
      "button",
      {
        text: this.matrixQ ? "List" : "Matrix",
      },
      (el) => {
        el.onclick = async () => {
          this.matrixQ = !this.matrixQ;
          el.innerText = this.matrixQ ? "List" : "Matrix";
          await this.draw();
        };
      }
    );

    contentEl.createEl("button", { text: "↻" }, (el) => {
      el.onclick = async () => await this.plugin.refreshIndex();
    });

    const data = currGraphs.hierGs.map((hier) => {
      const hierData: { [dir in Directions]: Graph } = blankDirUndef();
      for (const dir of DIRECTIONS) {
        // This is merging all graphs in Dir **In a particular hierarchy**, not accross all hierarchies like mergeGs(getAllGsInDir()) does
        hierData[dir] = mergeGs(...Object.values(hier[dir]));
      }
      return hierData;
    });
    debug(settings, { data });

    const hierSquares = this.getHierSquares(
      userHierarchies,
      data,
      currFile,
      settings
    );
    debug(settings, { hierSquares });

    const filteredSquaresArr = hierSquares.filter((squareArr) =>
      squareArr.some(
        (square) => square.realItems.length + square.impliedItems.length > 0
      )
    );

    const compInput = {
      target: contentEl,
      props: {
        filteredSquaresArr,
        currFile,
        settings,
        matrixView: this,
        app: this.app,
      },
    };

    this.matrixQ
      ? (this.view = new Matrix(compInput))
      : (this.view = new Lists(compInput));

    debugGroupEnd(settings, "debugMode");
  }
}
