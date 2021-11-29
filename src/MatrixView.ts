import { debug, error } from "loglevel";
import { ItemView, Notice, TFile, WorkspaceLeaf } from "obsidian";
import { Debugger } from "src/Debugger";
import Lists from "./Components/Lists.svelte";
import Matrix from "./Components/Matrix.svelte";
import {
  ARROW_DIRECTIONS,
  blankRealNImplied,
  MATRIX_VIEW,
  TRAIL_ICON,
} from "./constants";
import {
  getInNeighbours,
  getOppDir,
  getReflexiveClosure,
  getSubInDirs,
} from "./graphUtils";
import type {
  BCSettings,
  Directions,
  internalLinkObj,
  UserHier,
} from "./interfaces";
import type BCPlugin from "./main";
import { getRealnImplied, linkClass } from "./sharedFunctions";

export default class MatrixView extends ItemView {
  private plugin: BCPlugin;
  private view: Matrix | Lists;
  matrixQ: boolean;
  db: Debugger;

  constructor(leaf: WorkspaceLeaf, plugin: BCPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.db = new Debugger(plugin);
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

  toInternalLinkObj = (
    to: string,
    realQ = true,
    parent?: string
  ): internalLinkObj => {
    return {
      to,
      cls: linkClass(this.app, to, realQ),
      alt: this.getAlt(to, this.plugin.settings),
      order: this.getOrder(to),
      parent,
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
      const g = getSubInDirs(mainG, "up", "down");
      const closed = getReflexiveClosure(g, userHiers);
      const closedUp = getSubInDirs(closed, "up");

      let iSameArr: internalLinkObj[] = [];
      const currParents = closedUp.hasNode(basename)
        ? closedUp.filterOutNeighbors(basename, (n, a) =>
            hier.up.includes(a.field)
          )
        : [];

      currParents.forEach((parent) => {
        let impliedSiblings = [];
        // const { field } = up.getEdgeAttributes(basename, parent);
        closedUp.forEachInEdge(parent, (k, a, s, t) => {
          if (s === basename) return;
          // if (!settings.filterImpliedSiblingsOfDifferentTypes)
          impliedSiblings.push(s);
          // else if (a.field === field) {
          //   impliedSiblings.push(s);
          // }
        });

        impliedSiblings.forEach((impliedSibling) => {
          iSameArr.push(this.toInternalLinkObj(impliedSibling, false, parent));
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

      debug(
        { ru },
        { rs },
        { rd },
        { rn },
        { rp },
        { iu },
        { iSameArr },
        { id },
        { iN },
        { ip }
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
    try {
      const { contentEl, db } = this;
      db.start2G("Draw Matrix/List View");
      contentEl.empty();
      const { settings } = this.plugin;

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

      db.end2G();
    } catch (err) {
      error(err);
      this.db.end2G();
    }
  }
}
