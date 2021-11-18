import type { MultiGraph } from "graphology";
import type Graph from "graphology";
import { cloneDeep } from "lodash";
import { ItemView, TFile, WorkspaceLeaf } from "obsidian";
import { DIRECTIONS, MATRIX_VIEW, TRAIL_ICON } from "src/constants";
import type {
  BCSettings,
  Directions,
  internalLinkObj,
  SquareProps,
  userHierarchy,
} from "src/interfaces";
import type BCPlugin from "src/main";
import {
  copy,
  debug,
  debugGroupEnd,
  debugGroupStart,
  getInNeighbours,
  getOutNeighbours,
  getSinks,
  linkClass,
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
      let alt = null;
      if (settings.altLinkFields.length) {
        const toFile = this.app.metadataCache.getFirstLinkpathDest(to, "");
        if (toFile) {
          const metadata = this.app.metadataCache.getFileCache(toFile);
          settings.altLinkFields.forEach((altLinkField) => {
            alt = metadata?.frontmatter?.[altLinkField];
          });
        }
      }
      internalLinkObjArr.push({
        to,
        cls: linkClass(this.app, to, realQ),
        alt,
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
          index += `${indent.repeat(depth)}- ${
            wikilinkIndex ? "[[" : ""
          }${currNode}${wikilinkIndex ? "]]" : ""}`;

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

  getHierSquares(
    userHierarchies: userHierarchy[],
    data: { [dir in Directions]: Graph }[],
    currFile: TFile,
    settings: BCSettings
  ) {
    const { basename } = currFile;
    return userHierarchies.map((hier, i) => {
      const { up, same, down } = data[i];

      let [rUp, rSame, rDown, iUp, iDown] = [
        this.squareItems(up, currFile, settings),
        this.squareItems(same, currFile, settings),
        this.squareItems(down, currFile, settings),
        this.squareItems(down, currFile, settings, false),
        this.squareItems(up, currFile, settings, false),
      ];

      const rNext: internalLinkObj[] = [];
      const rPrev: internalLinkObj[] = [];
      let iNext: internalLinkObj[] = [];
      let iPrev: internalLinkObj[] = [];
      this.plugin.currGraphs.main.forEachEdge(basename, (k, a, s, t) => {
        if (a.dir === "next" && s === basename) {
          rNext.push({
            to: t,
            cls: linkClass(this.app, t, true),
            alt: this.getAlt(t, settings),
          });
        }
        if (a.dir === "prev" && t === basename) {
          iNext.push({
            to: s,
            cls: linkClass(this.app, s, false),
            alt: this.getAlt(s, settings),
          });
        }
        if (a.dir === "prev" && s === basename) {
          rPrev.push({
            to: t,
            cls: linkClass(this.app, t, true),
            alt: this.getAlt(t, settings),
          });
        }
        if (a.dir === "next" && t === basename) {
          iPrev.push({
            to: s,
            cls: linkClass(this.app, s, false),
            alt: this.getAlt(s, settings),
          });
        }
      });

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
          let alt = null;
          if (settings.altLinkFields.length) {
            const toFile = this.app.metadataCache.getFirstLinkpathDest(
              impliedSibling,
              ""
            );
            if (toFile) {
              const metadata = this.app.metadataCache.getFileCache(toFile);
              settings.altLinkFields.forEach((altLinkField) => {
                alt = metadata?.frontmatter?.[altLinkField];
              });
            }
          }

          iSameArr.push({
            to: impliedSibling,
            cls: linkClass(this.app, impliedSibling, false),
            alt,
          });
        });
      });

      /// A real sibling implies the reverse sibling
      iSameArr.push(...this.squareItems(same, currFile, settings, false));

      // !SECTION

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

      const upSquare: SquareProps = {
        realItems: rUp,
        impliedItems: iUp,
        fieldName:
          hier.up[0] === "" ? `${hier.down.join(",")}<Up>` : hier.up.join(", "),
      };

      const sameSquare: SquareProps = {
        realItems: rSame,
        impliedItems: iSameArr,
        fieldName:
          hier.same[0] === ""
            ? `${hier.up.join(",")}<Same>`
            : hier.same.join(", "),
      };

      const downSquare: SquareProps = {
        realItems: rDown,
        impliedItems: iDown,
        fieldName:
          hier.down[0] === ""
            ? `${hier.up.join(",")}<Down>`
            : hier.down.join(", "),
      };
      const nextSquare: SquareProps = {
        realItems: rNext,
        impliedItems: iNext,
        fieldName:
          hier.next[0] === ""
            ? `${hier.prev.join(",")}<Next>`
            : hier.next.join(", "),
      };
      const prevSquare: SquareProps = {
        realItems: rPrev,
        impliedItems: iPrev,
        fieldName:
          hier.prev[0] === ""
            ? `${hier.next.join(",")}<Prev>`
            : hier.prev.join(", "),
      };

      return [upSquare, sameSquare, downSquare, nextSquare, prevSquare];
    });
  }

  async draw(): Promise<void> {
    this.contentEl.empty();

    const { settings, currGraphs } = this.plugin;

    debugGroupStart(settings, "debugMode", "Draw Matrix/List View");

    const { userHierarchies } = settings;
    const currFile = this.app.workspace.getActiveFile();

    const viewToggleButton = this.contentEl.createEl("button", {
      text: this.matrixQ ? "List" : "Matrix",
    });
    viewToggleButton.addEventListener("click", async () => {
      this.matrixQ = !this.matrixQ;
      viewToggleButton.innerText = this.matrixQ ? "List" : "Matrix";
      await this.draw();
    });

    const refreshIndexButton = this.contentEl.createEl("button", {
      text: "🔁",
    });
    refreshIndexButton.addEventListener("click", async () => {
      await this.plugin.refreshIndex();
    });

    const data = currGraphs.hierGs.map((hier) => {
      const hierData: { [dir in Directions]: Graph } = {
        up: undefined,
        same: undefined,
        down: undefined,
        next: undefined,
        prev: undefined,
      };
      DIRECTIONS.forEach((dir) => {
        // This is merging all graphs in Dir **In a particular hierarchy**, not accross all hierarchies like mergeGs(getAllGsInDir()) does
        hierData[dir] = mergeGs(...Object.values(hier[dir]));
      });
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
      target: this.contentEl,
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
