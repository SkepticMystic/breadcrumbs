import { error, info } from "loglevel";
import { ItemView, TFile, WorkspaceLeaf } from "obsidian";
import { Debugger } from "src/Debugger";
import Matrix from "../Components/Matrix.svelte";
import {
  ARROW_DIRECTIONS,
  blankRealNImplied,
  MATRIX_VIEW,
  TRAIL_ICON,
} from "../constants";
import type {
  Directions,
  EdgeAttr,
  internalLinkObj,
  SquareItem,
  SquareProps,
  UserHier,
} from "../interfaces";
import type BCPlugin from "../main";
import { splitAndTrim } from "../Utils/generalUtils";
import { getOppDir, getOppFields } from "../Utils/HierUtils";
import { getDVApi, linkClass } from "../Utils/ObsidianUtils";

export function getMatrixNeighbours(plugin: BCPlugin, currNode: string) {
  const { closedG, settings } = plugin;
  const { userHiers } = settings;
  const neighbours = blankRealNImplied();
  if (!closedG) return neighbours;

  closedG.forEachEdge(currNode, (k, a, s, t) => {
    const { field, dir, implied } = a as EdgeAttr;

    if (s === currNode) {
      neighbours[dir].reals.push({ to: t, field, implied });
    } else {
      neighbours[getOppDir(dir)].implieds.push({
        to: s,
        field: getOppFields(userHiers, field, dir)[0],
        implied,
      });
    }
  });

  return neighbours;
}
export default class MatrixView extends ItemView {
  plugin: BCPlugin;
  private view: Matrix;
  db: Debugger;

  constructor(leaf: WorkspaceLeaf, plugin: BCPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.db = new Debugger(plugin);
  }

  async onload(): Promise<void> {
    super.onload();
    const { plugin, app } = this;

    app.workspace.onLayoutReady(() => {
      setTimeout(
        async () => await this.draw(),
        app.plugins.plugins.dataview
          ? app.plugins.plugins.dataview.api
            ? 1
            : plugin.settings.dvWaitTime
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

  async onOpen(): Promise<void> { }

  onClose(): Promise<void> {
    this.view?.$destroy();
    return Promise.resolve();
  }

  getAlt(node: string): string | null {
    const { app, plugin } = this;
    const { altLinkFields, showAllAliases } = plugin.settings;
    if (!altLinkFields.length) return null;

    // dv First
    const dv = getDVApi(plugin);
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
      const file = app.metadataCache.getFirstLinkpathDest(node, "");
      if (file) {
        const { frontmatter } = app.metadataCache.getFileCache(file);
        for (const altField of altLinkFields) {
          const value = frontmatter?.[altField];

          const arr: string[] =
            typeof value === "string" ? splitAndTrim(value) : value;
          if (value) return showAllAliases ? arr.join(", ") : arr[0];
        }
      }
    }
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

  sortItemsAlpha = (a: internalLinkObj, b: internalLinkObj) => {
    const { sortByNameShowAlias, alphaSortAsc } = this.plugin.settings;
    const aToSort = (sortByNameShowAlias ? a.to : a.alt ?? a.to).toLowerCase();
    const bToSort = (sortByNameShowAlias ? b.to : b.alt ?? b.to).toLowerCase();

    const less = alphaSortAsc ? -1 : 1;
    const more = alphaSortAsc ? 1 : -1;

    return aToSort < bToSort ? less : more;
  };

  getHierSquares(userHiers: UserHier[], currFile: TFile): SquareProps[][] {
    const { plugin } = this;
    const { mainG, settings } = plugin;
    const { enableAlphaSort, squareDirectionsOrder } = settings;
    if (!mainG) return [];

    const { basename } = currFile;
    if (!mainG.hasNode(basename)) return [];
    const realsnImplieds = getMatrixNeighbours(plugin, basename);

    return userHiers.map((hier) => {
      const filteredRealNImplied = blankRealNImplied() as unknown as {
        [dir in Directions]: {
          reals: internalLinkObj[];
          implieds: internalLinkObj[];
        };
      };

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

      if (enableAlphaSort)
        squares.forEach((sq) => sq.sort(this.sortItemsAlpha));

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
      const { contentEl, db, plugin } = this;
      db.start2G("Draw Matrix View");
      contentEl.empty();

      const { userHiers } = plugin.settings;

      const currFile = this.app.workspace.getActiveFile();
      if (!currFile) return;

      const hierSquares = this.getHierSquares(userHiers, currFile).filter(
        (squareArr) =>
          squareArr.some(
            (sq) => sq.realItems.length + sq.impliedItems.length > 0
          )
      );

      new Matrix({
        target: contentEl,
        props: { hierSquares, matrixView: this, currFile },
      })
      

      db.end2G();
    } catch (err) {
      error(err);
      this.db.end2G();
    }
  }
}
