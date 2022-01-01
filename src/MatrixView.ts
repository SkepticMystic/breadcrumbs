import { error, info } from "loglevel";
import { ItemView, TFile, WorkspaceLeaf } from "obsidian";
import { Debugger } from "src/Debugger";
import Lists from "./Components/Lists.svelte";
import Matrix from "./Components/Matrix.svelte";
import {
  ARROW_DIRECTIONS,
  blankRealNImplied,
  MATRIX_VIEW,
  TRAIL_ICON,
} from "./constants";
import { getOppDir, getReflexiveClosure, getSubInDirs } from "./graphUtils";
import type {
  Directions,
  internalLinkObj,
  SquareProps,
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

    this.app.workspace.onLayoutReady(() => {
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

  getAlt(node: string): string | null {
    const { altLinkFields } = this.plugin.settings;
    if (altLinkFields.length) {
      const file = this.app.metadataCache.getFirstLinkpathDest(node, "");
      if (file) {
        const metadata = this.app.metadataCache.getFileCache(file);
        for (const altField of altLinkFields) {
          const value = metadata?.frontmatter?.[altField];
          if (value) return value;
        }
      }
    } else return null;
  }

  toInternalLinkObj = (
    to: string,
    realQ = true,
    parent?: string
  ): internalLinkObj => {
    return {
      to,
      cls: linkClass(this.app, to, realQ),
      alt: this.getAlt(to),
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

  getHierSquares(userHiers: UserHier[], currFile: TFile): SquareProps[][] {
    const { plugin } = this;
    const { mainG, settings } = plugin;
    const {
      alphaSortAsc,
      enableAlphaSort,
      treatCurrNodeAsImpliedSibling,
      squareDirectionsOrder,
    } = settings;
    if (!mainG) return [];

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
        const oppDir = getOppDir(dir as Directions);
        const arrow = ARROW_DIRECTIONS[dir];
        const { reals, implieds } = realsnImplieds[dir];
        filteredRealNImplied[dir].reals = reals
          .filter(
            (real) =>
              hier[dir].includes(real.field) ||
              (real.field.includes(`<${arrow}>`) &&
                hier[oppDir].includes(real.field.split(" <")[0]))
          )
          .map((item) => this.toInternalLinkObj(item.to, true));

        filteredRealNImplied[dir].implieds = implieds
          .filter(
            (implied) =>
              hier[dir].includes(implied.field) ||
              (implied.field.includes(`<${arrow}>`) &&
                hier[oppDir].includes(implied.field.split(" <")[0]))
          )
          .map((item) => this.toInternalLinkObj(item.to, false));
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

      const iSamesII: internalLinkObj[] = [];
      if (closedUp.hasNode(basename)) {
        closedUp.forEachOutEdge(basename, (k, a, s, par) => {
          if (hier.up.includes(a.field)) {
            closedUp.forEachInEdge(par, (k, a, s, t) => {
              if (s === basename && !treatCurrNodeAsImpliedSibling) return;
              iSamesII.push(this.toInternalLinkObj(s, false, t));
            });
          }
        });
      }
      is.push(...iSamesII);

      // !SECTION

      [iu, is, id, iN, ip] = [
        this.removeDuplicateImplied(ru, iu),
        this.removeDuplicateImplied(rs, is),
        this.removeDuplicateImplied(rd, id),
        this.removeDuplicateImplied(rn, iN),
        this.removeDuplicateImplied(rp, ip),
      ];

      const iSameNoDup: internalLinkObj[] = [];
      is.forEach((impSib) => {
        if (iSameNoDup.every((noDup) => noDup.to !== impSib.to)) {
          iSameNoDup.push(impSib);
        }
      });
      is = iSameNoDup;

      const getFieldInHier = (dir: Directions) =>
        hier[dir][0]
          ? hier[dir].join(", ")
          : `${hier[getOppDir(dir)].join(",")}${ARROW_DIRECTIONS[dir]}`;

      const squares = [ru, rs, rd, rn, rp, iu, is, id, iN, ip];

      if (enableAlphaSort) {
        squares.forEach((sq) =>
          sq.sort((a, b) =>
            (a.alt ?? a.to) < (b.alt ?? b.to)
              ? alphaSortAsc
                ? -1
                : 1
              : alphaSortAsc
              ? 1
              : -1
          )
        );
      }
      squares.forEach((sq) => sq.sort((a, b) => a.order - b.order));

      info([
        { ru },
        { rs },
        { rd },
        { rn },
        { rp },
        { iu },
        { is },
        { id },
        { iN },
        { ip },
      ]);

      const square = [
        {
          realItems: ru,
          impliedItems: iu,
          field: getFieldInHier("up"),
        },

        {
          realItems: rs,
          impliedItems: is,
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

      return squareDirectionsOrder.map((order) => square[order]);
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
      if (!currFile) return;

      contentEl.createEl(
        "button",
        {
          text: this.matrixQ ? "List" : "Matrix",
          attr: { "aria-label": "Mode" },
        },
        (el) => {
          el.onclick = async () => {
            this.matrixQ = !this.matrixQ;
            el.innerText = this.matrixQ ? "List" : "Matrix";
            await this.draw();
          };
        }
      );

      contentEl.createEl(
        "button",
        { text: "↻", attr: { "aria-label": "Refresh Index" } },
        (el) => (el.onclick = async () => await this.plugin.refreshIndex())
      );

      contentEl.createEl(
        "button",
        {
          text: settings.alphaSortAsc ? "↗" : "↘",
          attr: { "aria-label": "Alphabetical sorting order" },
        },
        (el) => {
          el.onclick = async () => {
            this.plugin.settings.alphaSortAsc =
              !this.plugin.settings.alphaSortAsc;
            await this.plugin.saveSettings();
            el.innerText = settings.alphaSortAsc ? "↗" : "↘";
            await this.draw();
          };
        }
      );

      const hierSquares = this.getHierSquares(userHiers, currFile).filter(
        (squareArr) =>
          squareArr.some(
            (sq) => sq.realItems.length + sq.impliedItems.length > 0
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
