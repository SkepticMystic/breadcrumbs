import type Graph from "graphology";
import { cloneDeep } from "lodash";
import { ItemView, TFile, WorkspaceLeaf } from "obsidian";
import { DIRECTIONS, MATRIX_VIEW, TRAIL_ICON } from "src/constants";
import type {
  BreadcrumbsSettings,
  Directions,
  internalLinkObj,
  SquareProps,
  userHierarchy,
} from "src/interfaces";
import type BreadcrumbsPlugin from "src/main";
import {
  copy,
  debug,
  debugGroupEnd,
  debugGroupStart,
  mergeGs,
  getSinks,
} from "src/sharedFunctions";
import Lists from "./Components/Lists.svelte";
import Matrix from "./Components/Matrix.svelte";

export default class MatrixView extends ItemView {
  private plugin: BreadcrumbsPlugin;
  private view: Matrix | Lists;
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
        const settings = this.plugin.settings;
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
        const settings = this.plugin.settings;

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

  async onOpen(): Promise<void> {
    await this.plugin.saveSettings();
    // this.app.workspace.onLayoutReady(async () => {
    //   setTimeout(async () => await this.draw(), DATAVIEW_INDEX_DELAY);
    // });
    // this.app.workspace.on("dataview:api-ready", () =>
    //   console.log("dv ready")
    // );
  }

  onClose(): Promise<void> {
    if (this.view) {
      this.view.$destroy();
    }
    return Promise.resolve();
  }

  unresolvedQ(to: string, from: string): boolean {
    const { unresolvedLinks } = this.app.metadataCache;
    if (!unresolvedLinks[from]) {
      return false;
    }
    return unresolvedLinks[from][to] > 0;
  }

  squareItems(
    g: Graph,
    currFile: TFile,
    settings: BreadcrumbsSettings,
    realQ = true
  ): internalLinkObj[] {
    let items: string[];
    const altFieldsQ = !!settings.altLinkFields.length;

    if (realQ) {
      items = g.outNeighbors(currFile.basename);
    } else {
      items = g.inNeighbors(currFile.basename);
    }
    const internalLinkObjArr: internalLinkObj[] = [];
    // TODO I don't think I need to check the length here
    /// forEach won't run if it's empty anyway
    if (items.length) {
      items.forEach((to: string) => {
        let alt = null;
        if (altFieldsQ) {
          const toFile = this.app.metadataCache.getFirstLinkpathDest(
            to,
            currFile.path
          );
          if (toFile) {
            const metadata = this.app.metadataCache.getFileCache(toFile);
            settings.altLinkFields.forEach((altLinkField) => {
              const altLink = metadata?.frontmatter?.[altLinkField];
              if (altLink) {
                alt = altLink;
                return;
              }
            });
          }
        }
        internalLinkObjArr.push({
          to,
          cls:
            "internal-link breadcrumbs-link" +
            (this.unresolvedQ(to, currFile.path) ? " is-unresolved" : "") +
            (realQ ? "" : " breadcrumbs-implied"),
          alt,
        });
      });
    }
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
      const currPath = queue.shift();

      const newNodes = g.outNeighbors(currPath.node);
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
    return pathsArr;
  }

  createIndex(
    // Gotta give it a starting index. This allows it to work for the global index feat
    index: string,
    allPaths: string[][],
    settings: BreadcrumbsSettings
  ): string {
    const copy = cloneDeep(allPaths);
    const reversed = copy.map((path) => path.reverse());
    reversed.forEach((path) => path.shift());

    const indent = "  ";
    const visited: { [node: string]: number[] } = {};

    const activeFile = this.app.workspace.getActiveFile();
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
          index += `${indent.repeat(depth)}- `;
          index += settings.wikilinkIndex ? "[[" : "";
          index += currNode;
          index += settings.wikilinkIndex ? "]]" : "";

          if (settings.aliasesInIndex) {
            const currFile = this.app.metadataCache.getFirstLinkpathDest(
              currNode,
              activeFile.path
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

          if (!visited.hasOwnProperty(currNode)) {
            visited[currNode] = [];
          }
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
    settings: BreadcrumbsSettings
  ) {
    return userHierarchies.map((hier, i) => {
      const [currUpG, currSameG, currDownG] = [
        data[i].up,
        data[i].same,
        data[i].down,
      ];

      let [rUp, rSame, rDown, iUp, iDown] = [
        this.squareItems(currUpG, currFile, settings),
        this.squareItems(currSameG, currFile, settings),
        this.squareItems(currDownG, currFile, settings),
        this.squareItems(currDownG, currFile, settings, false),
        this.squareItems(currUpG, currFile, settings, false),
      ];

      // SECTION Implied Siblings
      /// Notes with the same parents
      const currParents = currUpG.outNeighbors(currFile.basename);
      let iSameArr: internalLinkObj[] = [];

      currParents.forEach((parent) => {
        let impliedSiblings = currUpG.inNeighbors(parent);

        // The current note is always it's own implied sibling, so remove it from the list
        const indexCurrNote = impliedSiblings.indexOf(currFile.basename);
        impliedSiblings.splice(indexCurrNote, 1);

        if (settings.filterImpliedSiblingsOfDifferentTypes) {
          impliedSiblings = impliedSiblings.filter((iSibling) => {
            const iSiblingType = currUpG.getNodeAttribute(
              iSibling,
              "fieldName"
            );
            const currNodeType = currUpG.getNodeAttribute(
              currFile.basename,
              "fieldName"
            );
            console.log({ iSiblingType, currNodeType });
            return iSiblingType === currNodeType;
          });
        }
        // Create the implied sibling SquareProps
        impliedSiblings.forEach((impliedSibling) => {
          const altFieldsQ = !!settings.altLinkFields.length;
          let alt = null;
          if (altFieldsQ) {
            const toFile = this.app.metadataCache.getFirstLinkpathDest(
              impliedSibling,
              currFile.path
            );
            if (toFile) {
              const metadata = this.app.metadataCache.getFileCache(toFile);
              settings.altLinkFields.forEach((altLinkField) => {
                const altLink = metadata?.frontmatter?.[altLinkField];
                if (altLink) {
                  alt = altLink;
                  return;
                }
              });
            }
          }

          iSameArr.push({
            to: impliedSibling,
            cls:
              "internal-link breadcrumbs-link breadcrumbs-implied" +
              (this.unresolvedQ(impliedSibling, currFile.path)
                ? " is-unresolved"
                : ""),
            // TODO get alt for implied siblings
            alt,
          });
        });
      });

      /// A real sibling implies the reverse sibling
      iSameArr.push(...this.squareItems(currSameG, currFile, settings, false));

      // !SECTION

      iUp = this.removeDuplicateImplied(rUp, iUp);
      iSameArr = this.removeDuplicateImplied(rSame, iSameArr);
      iDown = this.removeDuplicateImplied(rDown, iDown);

      const iSameNoDup: internalLinkObj[] = [];
      iSameArr.forEach((impSib) => {
        if (iSameNoDup.every((noDup) => noDup.to !== impSib.to)) {
          iSameNoDup.push(impSib);
        }
      });
      iSameArr = iSameNoDup;

      debug(settings, {
        rUp,
        iUp,
        rSame,
        iSameArr,
        rDown,
        iDown,
      });

      const upSquare: SquareProps = {
        realItems: rUp,
        impliedItems: iUp,
        fieldName:
          hier.up[0] === ""
            ? `${hier.down.join(",")}<Parents>`
            : hier.up.join(", "),
      };

      const sameSquare: SquareProps = {
        realItems: rSame,
        impliedItems: iSameArr,
        fieldName:
          hier.same[0] === ""
            ? `${hier.up.join(",")}<Siblings>`
            : hier.same.join(", "),
      };

      const downSquare: SquareProps = {
        realItems: rDown,
        impliedItems: iDown,
        fieldName:
          hier.down[0] === ""
            ? `${hier.up.join(",")}<Children>`
            : hier.down.join(", "),
      };

      return [upSquare, sameSquare, downSquare];
    });
  }

  async draw(): Promise<void> {
    this.contentEl.empty();

    const { settings } = this.plugin;

    debugGroupStart(settings, "debugMode", "Draw Matrix/List View");

    const hierGs = this.plugin.currGraphs;
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

    const data = hierGs.hierGs.map((hier) => {
      const hierData: { [dir in Directions]: Graph } = {
        up: undefined,
        same: undefined,
        down: undefined,
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

    if (this.matrixQ) {
      this.view = new Matrix(compInput);
    } else {
      this.view = new Lists(compInput);
    }
    debugGroupEnd(settings, "debugMode");
  }
}
