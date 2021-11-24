import { ItemView, Notice, TFile, WorkspaceLeaf } from "obsidian";
import {
  ARROW_DIRECTIONS,
  blankRealNImplied,
  MATRIX_VIEW,
  TRAIL_ICON,
} from "./constants";
import type {
  BCSettings,
  Directions,
  internalLinkObj,
  UserHier,
} from "./interfaces";
import type BCPlugin from "./main";
import {
  debugGroupEnd,
  debugGroupStart,
  getRealnImplied,
  linkClass,
} from "./sharedFunctions";
import Lists from "./Components/Lists.svelte";
import Matrix from "./Components/Matrix.svelte";
import {
  getSubInDirs,
  getReflexiveClosure,
  getInNeighbours,
  getOppDir,
} from "./graphUtils";

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

  getAlt(node: string, settings: BCSettings) {
    let alt = null;
    if (settings.altLinkFields.length) {
      const file = this.app.metadataCache.getFirstLinkpathDest(node, "");
      if (file) {
        const metadata = this.app.metadataCache.getFileCache(file);
        settings.altLinkFields.forEach((altLinkField) => {
          alt = metadata?.frontmatter?.[altLinkField];
        });
      }
    }
    return alt;
  }

  toInternalLinkObj = (to: string, realQ = true) => {
    return {
      to,
      cls: linkClass(this.app, to, realQ),
      alt: this.getAlt(to, this.plugin.settings),
      order: this.getOrder(to),
    };
  };

  // ANCHOR Remove duplicate implied links

  removeDuplicateImplied(
    reals: internalLinkObj[],
    implieds: internalLinkObj[]
  ): internalLinkObj[] {
    const realTos = reals.map((real) => real.to);
    return implieds.filter((implied) => !realTos.includes(implied.to));
  }

  getOrder = (node: string) =>
    Number.parseInt(this.plugin.mainG.getNodeAttribute(node, "order"));

  getHierSquares(userHiers: UserHier[], currFile: TFile, settings: BCSettings) {
    const { plugin } = this;
    const { mainG } = plugin;
    if (!mainG) {
      new Notice(
        "Breadcrumbs graph was not initialised yet. Please Refresh Index"
      );
      return [];
    }
    const { basename } = currFile;

    const g = getSubInDirs(mainG, "up", "down");
    const closed = getReflexiveClosure(g, userHiers);
    const up = getSubInDirs(closed, "up");

    const realsnImplieds = getRealnImplied(plugin, basename);

    return userHiers.map((hier) => {
      const filteredRealNImplied: {
        [dir in Directions]: {
          reals: internalLinkObj[];
          implieds: internalLinkObj[];
        };
      } = blankRealNImplied();

      for (const dir in realsnImplieds) {
        const { reals, implieds } = realsnImplieds[dir];
        filteredRealNImplied[dir].reals = reals
          .filter((real) => hier[dir].includes(real.field))
          .map((item) =>
            this.toInternalLinkObj(item.to, true)
          ) as internalLinkObj[];
        filteredRealNImplied[dir].implieds = implieds
          .filter((implied) => hier[dir].includes(implied.field))
          .map((item) =>
            this.toInternalLinkObj(item.to, false)
          ) as internalLinkObj[];
      }

      let {
        up: { reals: ru, implieds: iu },
        same: { reals: rs, implieds: is },
        down: { reals: rd, implieds: id },
        next: { reals: rn, implieds: iN },
        prev: { reals: rp, implieds: ip },
      } = filteredRealNImplied;

      // SECTION Implied Siblings
      /// Notes with the same parents

      let iSameArr: internalLinkObj[] = [];
      const currParents = up.hasNode(basename)
        ? up.filterOutNeighbors(basename, (n, a) =>
            Object.values(hier).flat().includes(a.field)
          )
        : [];

      currParents.forEach((parent) => {
        let impliedSiblings = getInNeighbours(up, parent);

        // The current note is always it's own implied sibling, so remove it from the list
        const indexCurrNote = impliedSiblings.indexOf(basename);
        impliedSiblings.splice(indexCurrNote, 1);

        if (settings.filterImpliedSiblingsOfDifferentTypes) {
          const currNodeType: string = up.getNodeAttribute(basename, "field");
          impliedSiblings = impliedSiblings.filter((iSibling) => {
            const iSiblingType: string = up.getNodeAttribute(iSibling, "field");
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
      iSameArr.push(...is);

      // !SECTION

      iu = this.removeDuplicateImplied(ru, iu);
      iSameArr = this.removeDuplicateImplied(rs, iSameArr);
      id = this.removeDuplicateImplied(rd, id);
      iN = this.removeDuplicateImplied(rn, iN);
      ip = this.removeDuplicateImplied(rp, ip);

      const iSameNoDup: internalLinkObj[] = [];
      iSameArr.forEach((impSib) => {
        if (iSameNoDup.every((noDup) => noDup.to !== impSib.to)) {
          iSameNoDup.push(impSib);
        }
      });
      iSameArr = iSameNoDup;

      const getFieldInHier = (dir: Directions) =>
        hier[dir][0]
          ? hier[dir].join(", ")
          : `${hier[getOppDir(dir)].join(",")}${ARROW_DIRECTIONS[dir]}`;

      const { alphaSortAsc } = settings;
      [ru, rs, rd, rn, rp, iu, iSameArr, id, iN, ip].forEach((a) =>
        a
          .sort((a, b) =>
            a.to < b.to ? (alphaSortAsc ? -1 : 1) : alphaSortAsc ? 1 : -1
          )
          .sort((a, b) => a.order - b.order)
      );

      return [
        {
          realItems: ru,
          impliedItems: iu,
          field: getFieldInHier("up"),
        },

        {
          realItems: rs,
          impliedItems: iSameArr,
          field: getFieldInHier("same"),
        },

        {
          realItems: rd,
          impliedItems: id,
          field: getFieldInHier("down"),
        },
        {
          realItems: rn,
          impliedItems: iN,
          field: getFieldInHier("next"),
        },
        {
          realItems: rp,
          impliedItems: ip,
          field: getFieldInHier("prev"),
        },
      ];
    });
  }

  async draw(): Promise<void> {
    const { contentEl } = this;
    contentEl.empty();
    const { settings } = this.plugin;

    debugGroupStart(settings, "debugMode", "Draw Matrix/List View");

    const { userHiers } = settings;
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

    // const data = currGraphs.hierGs.map((hierG) => {
    //   const hierData: { [dir in Directions]: Graph } = blankDirUndef();
    //   for (const dir of DIRECTIONS) {
    //     // This is merging all graphs in Dir **In a particular hierarchy**, not accross all hierarchies like mergeGs(getAllGsInDir()) does
    //     hierData[dir] = mergeGs(...Object.values(hierG[dir]));
    //   }
    //   return hierData;
    // });

    const hierSquares = this.getHierSquares(
      userHiers,
      currFile,
      settings
    ).filter((squareArr) =>
      squareArr.some(
        (square) => square.realItems.length + square.impliedItems.length > 0
      )
    );

    const compInput = {
      target: contentEl,
      props: {
        filteredSquaresArr: hierSquares,
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
