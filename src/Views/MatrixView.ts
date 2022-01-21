import { error, info } from "loglevel";
import { ItemView, TFile, WorkspaceLeaf } from "obsidian";
import { Debugger } from "src/Debugger";
import Lists from "../Components/Lists.svelte";
import Matrix from "../Components/Matrix.svelte";
import {
  ARROW_DIRECTIONS,
  blankRealNImplied,
  MATRIX_VIEW,
  TRAIL_ICON,
} from "../constants";
import { getOppDir } from "../graphUtils";
import type {
  Directions,
  internalLinkObj,
  SquareItem,
  SquareProps,
  UserHier,
} from "../interfaces";
import type BCPlugin from "../main";
import { refreshIndex } from "../refreshIndex";
import {
  getMatrixNeighbours,
  linkClass,
  splitAndTrim,
} from "../sharedFunctions";

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
    const { altLinkFields, showAllAliases } = this.plugin.settings;
    if (altLinkFields.length) {
      // dv First
      const dv = this.app.plugins.plugins.dataview?.api;
      if (dv) {
        const page = dv.page(node);
        if (!page) return null;
        for (const alt of altLinkFields) {
          const value = page[alt] as string;

          const arr: string[] =
            typeof value === "string" ? splitAndTrim(value) : value;
          if (value) return showAllAliases ? arr.join(", ") : arr[0];
        }
      } else {
        const file = this.app.metadataCache.getFirstLinkpathDest(node, "");
        if (file) {
          const metadata = this.app.metadataCache.getFileCache(file);
          for (const altField of altLinkFields) {
            const value = metadata?.frontmatter?.[altField];

            const arr: string[] =
              typeof value === "string" ? splitAndTrim(value) : value;
            if (value) return showAllAliases ? arr.join(", ") : arr[0];
          }
        }
      }
    } else return null;
  }

  toInternalLinkObj = (
    to: string,
    realQ = true,
    parent: string | null,
    implied?: string
  ): internalLinkObj => {
    return {
      to,
      cls: linkClass(this.app, to, realQ),
      alt: this.getAlt(to),
      order: this.getOrder(to),
      parent,
      implied,
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
      sortByNameShowAlias,
    } = settings;
    if (!mainG) return [];

    const { basename } = currFile;
    // const realsnImplieds = getRealnImplied(plugin, basename);
    const realsnImplieds = getMatrixNeighbours(plugin, basename);

    return userHiers.map((hier) => {
      const filteredRealNImplied: {
        [dir in Directions]: {
          reals: internalLinkObj[];
          implieds: internalLinkObj[];
        };
      } = blankRealNImplied();

      const resultsFilter = (
        item: SquareItem,
        dir: Directions,
        oppDir: Directions,
        arrow: string
      ) =>
        hier[dir].includes(item.field) ||
        (item.field.includes(`<${arrow}>`) &&
          hier[oppDir].includes(item.field.split(" <")[0]));

      for (const dir in realsnImplieds) {
        const oppDir = getOppDir(dir as Directions);
        const arrow = ARROW_DIRECTIONS[dir];
        const { reals, implieds } = realsnImplieds[dir];

        filteredRealNImplied[dir].reals = reals
          .filter((real) =>
            resultsFilter(real, dir as Directions, oppDir, arrow)
          )
          .map((item) =>
            this.toInternalLinkObj(item.to, true, null, item.implied)
          );

        filteredRealNImplied[dir].implieds = implieds
          .filter((implied) =>
            resultsFilter(implied, dir as Directions, oppDir, arrow)
          )
          .map((item) =>
            this.toInternalLinkObj(item.to, false, null, item.implied)
          );
      }

      let {
        up: { reals: ru, implieds: iu },
        same: { reals: rs, implieds: is },
        down: { reals: rd, implieds: id },
        next: { reals: rn, implieds: iN },
        prev: { reals: rp, implieds: ip },
      } = filteredRealNImplied;

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
            (sortByNameShowAlias ? a.to : a.alt ?? a.to) <
            (sortByNameShowAlias ? b.to : b.alt ?? b.to)
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

  drawButtons(contentEl: HTMLElement) {
    const { plugin, matrixQ } = this;
    const { settings } = plugin;
    const { alphaSortAsc } = settings;
    contentEl.createEl(
      "button",
      {
        text: matrixQ ? "List" : "Matrix",
        attr: {
          "aria-label": "Mode",
          style: "padding: 1px 6px 2px 6px !important; margin-left: 7px;",
        },
      },
      (el) => {
        el.onclick = async () => {
          this.matrixQ = !matrixQ;
          el.innerText = matrixQ ? "List" : "Matrix";
          await this.draw();
        };
      }
    );

    contentEl.createEl(
      "button",
      {
        text: "↻",
        attr: {
          "aria-label": "Refresh Index",
          style: "padding: 1px 6px 2px 6px;",
        },
      },
      (el) => (el.onclick = async () => await refreshIndex(plugin))
    );

    contentEl.createEl(
      "button",
      {
        text: alphaSortAsc ? "↗" : "↘",
        attr: {
          "aria-label": "Alphabetical sorting order",
          style: "padding: 1px 6px 2px 6px;",
        },
      },
      (el) => {
        el.onclick = async () => {
          plugin.settings.alphaSortAsc = !alphaSortAsc;
          await this.plugin.saveSettings();
          el.innerText = alphaSortAsc ? "↗" : "↘";
          await this.draw();
        };
      }
    );
  }

  async draw(): Promise<void> {
    try {
      const { contentEl, db, plugin } = this;
      db.start2G("Draw Matrix/List View");
      contentEl.empty();
      const { settings } = plugin;
      const { userHiers } = settings;
      const currFile = this.app.workspace.getActiveFile();
      if (!currFile) return;

      this.drawButtons(contentEl);

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
