import { getApi } from "@aidenlx/folder-note-core";
import Graph, { MultiGraph } from "graphology";
import { dfsFromNode } from "graphology-traversal";
import { parseTypedLink } from "juggl-api";
import { cloneDeep } from "lodash";
import { debug, error, info } from "loglevel";
import {
  addIcon,
  EventRef,
  MarkdownView,
  normalizePath,
  Notice,
  Plugin,
  Pos,
  TFile,
  WorkspaceLeaf,
} from "obsidian";
import {
  addFeatherIcon,
  copy,
  openView,
} from "obsidian-community-lib/dist/utils";
import { Debugger } from "src/Debugger";
import util from "util";
import { BCSettingTab } from "./BreadcrumbsSettingTab";
import NextPrev from "./Components/NextPrev.svelte";
import TrailGrid from "./Components/TrailGrid.svelte";
import TrailPath from "./Components/TrailPath.svelte";
import {
  DEFAULT_SETTINGS,
  dropHeaderOrAlias,
  MATRIX_VIEW,
  splitLinksRegex,
  TRAIL_ICON,
  TRAIL_ICON_SVG,
  VIEWS,
} from "./constants";
import { FieldSuggestor } from "./FieldSuggestor";
import {
  addEdgeIfNot,
  addNodesIfNot,
  getFieldInfo,
  getInNeighbours,
  getOppDir,
  getOppFields,
  getReflexiveClosure,
  getSinks,
  getSubForFields,
  getSubInDirs,
} from "./graphUtils";
import type {
  BCSettings,
  Directions,
  dvFrontmatterCache,
  dvLink,
  HierarchyNoteItem,
  JugglLink,
  MyView,
  RawValue,
} from "./interfaces";
import {
  createOrUpdateYaml,
  // debugGroupEnd,
  // debugGroupStart,
  getBaseFromPath,
  getDVBasename,
  getFields,
  getFolder,
  getRealnImplied,
  iterateHiers,
  makeWiki,
  splitAtYaml,
} from "./sharedFunctions";
import { VisModal } from "./VisModal";

export default class BCPlugin extends Plugin {
  settings: BCSettings;
  visited: [string, HTMLDivElement][] = [];
  refreshIntervalID: number;
  mainG: MultiGraph;
  activeLeafChange: EventRef = undefined;
  layoutChange: EventRef = undefined;
  statusBatItemEl: HTMLElement = undefined;
  db: Debugger;

  async refreshIndex() {
    if (!this.activeLeafChange) this.registerActiveLeafChangeEvent();
    if (!this.layoutChange) this.registerLayoutChangeEvent();
    this.mainG = await this.initGraphs();
    for (const view of VIEWS) await this.getActiveTYPEView(view.type)?.draw();
    if (this.settings.showTrail) await this.drawTrail();
    new Notice("Index refreshed");
  }

  registerActiveLeafChangeEvent() {
    this.activeLeafChange = this.app.workspace.on(
      "active-leaf-change",
      async () => {
        if (this.settings.refreshOnNoteChange) {
          await this.refreshIndex();
        } else {
          const activeView = this.getActiveTYPEView(MATRIX_VIEW);
          if (activeView) await activeView.draw();
          if (this.settings.showBCs) await this.drawTrail();
        }
      }
    );
    this.registerEvent(this.activeLeafChange);
  }

  registerLayoutChangeEvent() {
    this.layoutChange = this.app.workspace.on("layout-change", async () => {
      if (this.settings.showBCs) await this.drawTrail();
    });
    this.registerEvent(this.layoutChange);
  }

  initEverything = async () => {
    const { settings } = this;
    this.mainG = await this.initGraphs();

    for (const view of VIEWS) {
      if (view.openOnLoad)
        await openView(this.app, view.type, view.constructor);
    }

    if (settings.showBCs) await this.drawTrail();

    this.registerActiveLeafChangeEvent();
    this.registerLayoutChangeEvent();
  };

  async onload(): Promise<void> {
    console.log("loading breadcrumbs plugin");

    await this.loadSettings();

    if (typeof this.settings.debugMode === "boolean") {
      this.settings.debugMode = this.settings.debugMode ? "DEBUG" : "WARN";
      await this.saveSettings();
    }

    // Prevent breaking change
    //@ts-ignore
    const { userHierarchies } = this.settings;
    if (userHierarchies !== undefined && userHierarchies.length > 0) {
      this.settings.userHiers = userHierarchies;
      //@ts-ignore
      delete this.settings.userHierarchies;
      await this.saveSettings();
    }

    ["prev", "next"].forEach((dir) => {
      this.settings.userHiers.forEach(async (hier, i) => {
        if (hier[dir] === undefined) this.settings.userHiers[i][dir] = [];
        await this.saveSettings();
      });
    });
    const upFields = getFields(this.settings.userHiers, "up");
    for (const field in this.settings.limitTrailCheckboxStates) {
      if (!upFields.includes(field)) {
        delete this.settings.limitTrailCheckboxStates[field];
      }
    }

    for (const view of VIEWS) {
      this.registerView(
        view.type,
        (leaf: WorkspaceLeaf) => new view.constructor(leaf, this)
      );
    }

    this.db = new Debugger(this);
    this.registerEditorSuggest(new FieldSuggestor(this));

    this.app.workspace.onLayoutReady(async () => {
      if (this.app.plugins.enabledPlugins.has("dataview")) {
        const api = this.app.plugins.plugins.dataview?.api;
        if (api) {
          await this.initEverything();
        } else {
          this.registerEvent(
            this.app.metadataCache.on("dataview:api-ready", async () => {
              await this.initEverything();
            })
          );
        }
      }
    });

    addIcon(TRAIL_ICON, TRAIL_ICON_SVG);

    for (const view of VIEWS) {
      this.addCommand({
        id: `show-${view.type}-view`,
        name: `Open ${view.plain} View`,
        //@ts-ignore
        checkCallback: async (checking: boolean) => {
          if (checking) {
            return this.app.workspace.getLeavesOfType(view.type).length === 0;
          }
          await openView(this.app, view.type, view.constructor);
        },
      });
    }

    this.addCommand({
      id: "open-vis-modal",
      name: "Open Visualisation Modal",
      callback: () => {
        new VisModal(this.app, this).open();
      },
    });

    this.addCommand({
      id: "Refresh-Breadcrumbs-Index",
      name: "Refresh Breadcrumbs Index",
      callback: async () => await this.refreshIndex(),
    });

    this.addCommand({
      id: "Write-Breadcrumbs-to-Current-File",
      name: "Write Breadcrumbs to Current File",
      callback: async () => {
        const currFile = this.app.workspace.getActiveFile();
        await this.writeBCToFile(currFile);
      },
    });

    this.addCommand({
      id: "Write-Breadcrumbs-to-All-Files",
      name: "Write Breadcrumbs to **ALL** Files",
      callback: async () => {
        const first = window.confirm(
          "This action will write the implied Breadcrumbs of each file to that file.\nIt uses the MetaEdit plugins API to update the YAML, so it should only affect that frontmatter of your note.\nI can't promise that nothing bad will happen. **This operation cannot be undone**."
        );
        if (first) {
          const second = window.confirm(
            "Are you sure? You have been warned that this operation will attempt to update all files with implied breadcrumbs."
          );
          if (second) {
            const third = window.confirm(
              "For real, please make a back up before"
            );
            if (third) {
              try {
                const files = this.app.vault.getMarkdownFiles();
                for (const file of files) await this.writeBCToFile(file);
                new Notice("Operation Complete");
              } catch (err) {
                new Notice(err);
                error(err);
              }
            }
          }
        }
      },
      checkCallback: () => this.settings.showWriteAllBCsCmd,
    });

    this.addCommand({
      id: "local-index",
      name: "Copy a Local Index to the clipboard",
      callback: async () => {
        const { settings, mainG } = this;
        const { basename } = this.app.workspace.getActiveFile();

        const g = getSubInDirs(mainG, "up", "down");
        const closed = getReflexiveClosure(g, settings.userHiers);
        const onlyDowns = getSubInDirs(closed, "down");

        const allPaths = this.dfsAllPaths(onlyDowns, basename);
        const index = this.createIndex(allPaths);
        info({ index });
        await copy(index);
      },
    });

    this.addCommand({
      id: "global-index",
      name: "Copy a Global Index to the clipboard",
      callback: async () => {
        const { mainG, settings } = this;

        const g = getSubInDirs(mainG, "up", "down");
        const closed = getReflexiveClosure(g, settings.userHiers);
        const onlyDowns = getSubInDirs(closed, "down");

        const sinks = getSinks(mainG);

        let globalIndex = "";
        sinks.forEach((terminal) => {
          globalIndex += terminal + "\n";
          const allPaths = this.dfsAllPaths(onlyDowns, terminal);
          globalIndex += this.createIndex(allPaths) + "\n";
        });

        info({ globalIndex });
        await copy(globalIndex);
      },
    });

    this.addRibbonIcon(
      addFeatherIcon("tv") as string,
      "Breadcrumbs Visualisation",
      () => new VisModal(this.app, this).open()
    );

    this.statusBatItemEl = this.addStatusBarItem();

    this.addSettingTab(new BCSettingTab(this.app, this));
  }

  writeBCToFile = async (file: TFile) => {
    const { app, settings, mainG } = this;
    const { limitWriteBCCheckboxStates, writeBCsInline } = settings;

    const { frontmatter } = app.metadataCache.getFileCache(file);
    const api = app.plugins.plugins.metaedit?.api;

    if (!api) {
      new Notice("Metaedit must be enabled for this function to work");
      return;
    }

    const succs = getInNeighbours(mainG, file.basename);

    for (const succ of succs) {
      const { field } = mainG.getNodeAttributes(succ);
      if (!limitWriteBCCheckboxStates[field]) return;

      if (!writeBCsInline) {
        await createOrUpdateYaml(field, succ, file, frontmatter, api);
      } else {
        // TODO Check if this note already has this field
        let content = await app.vault.read(file);
        const splits = splitAtYaml(content);
        content = splits[0] + `\n${field}:: [[${succ}]]` + splits[1];

        await app.vault.modify(file, content);
      }
    }
  };

  getActiveTYPEView(type: string): MyView | null {
    const { constructor } = VIEWS.find((view) => view.type === type);
    const leaves = this.app.workspace.getLeavesOfType(type);
    if (leaves && leaves.length >= 1) {
      const view = leaves[0].view;
      if (view instanceof constructor) {
        return view;
      }
    }
    return null;
  }

  async getHierarchyNoteItems(file: TFile) {
    const { userHiers } = this.settings;
    const { listItems } = this.app.metadataCache.getFileCache(file);
    if (!listItems) return [];

    const lines = (await this.app.vault.cachedRead(file)).split("\n");

    const hierarchyNoteItems: HierarchyNoteItem[] = [];

    const afterBulletReg = new RegExp(/\s*[+*-]\s(.*$)/);
    const dropWikiLinksReg = new RegExp(/\[\[(.*?)\]\]/);
    const fieldReg = new RegExp(/(.*?)\[\[.*?\]\]/);

    const problemFields: string[] = [];

    const upFields = getFields(userHiers, "up");
    for (const item of listItems) {
      const currItem = lines[item.position.start.line];

      const afterBulletCurr = afterBulletReg.exec(currItem)[1];
      const dropWikiCurr = dropWikiLinksReg.exec(afterBulletCurr)[1];
      let fieldCurr = fieldReg.exec(afterBulletCurr)[1].trim() || null;

      // Ensure fieldName is one of the existing up fields. `null` if not
      if (fieldCurr !== null && !upFields.includes(fieldCurr)) {
        problemFields.push(fieldCurr);
        fieldCurr = null;
      }

      const { parent } = item;
      if (parent >= 0) {
        const parentNote = lines[parent];
        const afterBulletParent = afterBulletReg.exec(parentNote)[1];
        const dropWikiParent = dropWikiLinksReg.exec(afterBulletParent)[1];

        hierarchyNoteItems.push({
          currNote: dropWikiCurr,
          parentNote: dropWikiParent,
          field: fieldCurr,
        });
      } else {
        hierarchyNoteItems.push({
          currNote: dropWikiCurr,
          parentNote: null,
          field: fieldCurr,
        });
      }
    }
    if (problemFields.length > 0) {
      const msg = `'${problemFields.join(
        ", "
      )}' is/are not a field in any of your hierarchies, but is/are being used in: '${
        file.basename
      }'`;
      new Notice(msg);
      console.log(msg, { problemFields });
    }
    return hierarchyNoteItems;
  }

  getDVMetadataCache(files: TFile[]) {
    const { app, db } = this;
    db.startGs("getDVMetadataCache", "dvCaches");

    const frontms: dvFrontmatterCache[] = files.map((file) => {
      const dvCache: dvFrontmatterCache = app.plugins.plugins.dataview.api.page(
        file.path
      );
      debug(`${file.basename}:`, { dvCache });
      return dvCache;
    });

    db.endGs(2, { frontms });
    return frontms;
  }

  getObsMetadataCache(files: TFile[]) {
    const { app, db } = this;
    db.startGs("getObsMetadataCache", "obsCaches");

    const frontms: dvFrontmatterCache[] = files.map((file) => {
      debug(`GetObsMetadataCache: ${file.basename}`);
      const { frontmatter } = app.metadataCache.getFileCache(file);
      debug({ frontmatter });
      if (frontmatter) return { file, ...frontmatter };
      else return { file };
    });

    db.endGs(2, { frontms });
    return frontms;
  }

  // SECTION OneSource

  populateMain(
    mainG: MultiGraph,
    source: string,
    dir: Directions,
    field: string,
    target: string,
    sourceOrder: number,
    targetOrder: number,
    opps?: { oppField: string; oppDir: Directions }
  ): void {
    addNodesIfNot(mainG, [source], {
      dir,
      field,
      //@ts-ignore
      order: sourceOrder,
    });
    // targets.forEach((target) => {

    addNodesIfNot(mainG, [target], {
      dir,
      field,
      //@ts-ignore
      order: targetOrder,
    });

    addEdgeIfNot(mainG, source, target, {
      dir,
      field,
    });
    if (opps) {
      addEdgeIfNot(mainG, target, source, {
        dir: opps.oppDir,
        field: opps.oppField,
      });
    }
    // });
  }

  async getCSVRows() {
    const { CSVPaths } = this.settings;
    const CSVRows: { [key: string]: string }[] = [];
    if (CSVPaths === "") return CSVRows;

    const fullPath = normalizePath(CSVPaths);

    const content = await this.app.vault.adapter.read(fullPath);
    const lines = content.split("\n");

    const headers = lines[0].split(",").map((head) => head.trim());
    lines.slice(1).forEach((row) => {
      const rowObj = {};
      row
        .split(",")
        .map((head) => head.trim())
        .forEach((item, i) => {
          rowObj[headers[i]] = item;
        });
      CSVRows.push(rowObj);
    });
    return CSVRows;
  }

  addCSVCrumbs(
    g: Graph,
    CSVRows: { [key: string]: string }[],
    dir: Directions,
    field: string
  ) {
    CSVRows.forEach((row) => {
      //@ts-ignore
      addNodesIfNot(g, [row.file], { dir, field });
      if (field === "" || !row[field]) return;

      //@ts-ignore
      addNodesIfNot(g, [row[field]], { dir, field });
      //@ts-ignore
      addEdgeIfNot(g, row.file, row[field], { dir, field });
    });
  }

  /**
   * Keep unwrapping a proxied item until it isn't one anymore
   * @param  {RawValue} item
   */
  unproxy(item: RawValue) {
    const unproxied = [];

    const queue = [item];
    while (queue.length) {
      const currItem = queue.shift();
      if (util.types.isProxy(currItem)) {
        const possibleUnproxied = Object.assign({}, currItem);
        const { values } = possibleUnproxied;
        if (values) queue.push(...values);
        else unproxied.push(possibleUnproxied);
      } else {
        unproxied.push(currItem);
      }
    }
    return unproxied;
  }

  /**
   * Given a `dvCache[field]` value, parse the link(s) out of it
   * @param  {string|string[]|string[][]|dvLink|dvLink[]|Pos|TFile} value
   * @param  {BCSettings} settings
   */
  parseFieldValue(
    value: string | string[] | string[][] | dvLink | dvLink[] | Pos | TFile
  ) {
    if (value === undefined) return [];
    const parsed: string[] = [];
    try {
      const rawValuesPreFlat = value;
      if (!rawValuesPreFlat) return [];
      if (typeof rawValuesPreFlat === "string") {
        const splits = rawValuesPreFlat.match(splitLinksRegex);
        if (splits !== null) {
          const linkNames = splits.map((link) =>
            getBaseFromPath(link.match(dropHeaderOrAlias)[1])
          );
          parsed.push(...linkNames);
        }
      } else {
        const rawValues: RawValue[] = [value].flat(4);

        debug(...rawValues);

        rawValues.forEach((rawItem) => {
          if (!rawItem) return;
          const unProxied = this.unproxy(rawItem);
          unProxied.forEach((value) => {
            if (typeof value === "string" || typeof value === "number") {
              const rawAsString = value.toString();
              const splits = rawAsString.match(splitLinksRegex);
              if (splits !== null) {
                const strs = splits.map((link) =>
                  getBaseFromPath(link.match(dropHeaderOrAlias)[1])
                );
                parsed.push(...strs);
              } else parsed.push(getBaseFromPath(rawAsString));
            } else if (value.path !== undefined) {
              const basename = getBaseFromPath(value.path);
              if (basename !== undefined) parsed.push(basename);
            }
          });
        });
      }
      return parsed;
    } catch (err) {
      error(err);
      return parsed;
    }
  }

  // TODO I think it'd be better to do this whole thing as an obj instead of JugglLink[]
  // => {[note: string]: {type: string, linksInLine: string[]}[]}
  async getJugglLinks(files: TFile[]): Promise<JugglLink[]> {
    const { settings, app, db } = this;
    db.start2G("getJugglLinks");

    const { userHiers } = settings;

    // Add Juggl links
    const typedLinksArr: JugglLink[] = await Promise.all(
      files.map(async (file) => {
        const jugglLink: JugglLink = { file, links: [] };

        // Use Obs metadatacache to get the links in the current file
        const links = app.metadataCache.getFileCache(file)?.links ?? [];

        const content = links.length ? await app.vault.cachedRead(file) : "";
        const lines = content.split("\n");

        links.forEach((link) => {
          const lineNo = link.position.start.line;
          const line = lines[lineNo];

          // Check the line for wikilinks, and return an array of link.innerText
          const linksInLine =
            line
              .match(splitLinksRegex)
              ?.map((link) => link.slice(2, link.length - 2))
              ?.map((innerText) => innerText.split("|")[0]) ?? [];

          const typedLinkPrefix =
            app.plugins.plugins.juggl?.settings.typedLinkPrefix ?? "-";

          const parsedLinks = parseTypedLink(link, line, typedLinkPrefix);

          const field = parsedLinks?.properties?.type ?? "";
          const { fieldDir } = getFieldInfo(userHiers, field);
          if (!fieldDir) return;

          jugglLink.links.push({
            dir: fieldDir,
            field,
            linksInLine,
          });
        });
        return jugglLink;
      })
    );

    const allFields = getFields(userHiers);

    const filteredLinks = typedLinksArr.map((jugglLink) => {
      // Filter out links whose type is not in allFields
      jugglLink.links = jugglLink.links.filter((link) =>
        allFields.includes(link.field)
      );
      return jugglLink;
    });
    db.end2G({ filteredLinks });
    return filteredLinks;
  }

  addHNsToGraph(hierarchyNotesArr: HierarchyNoteItem[], mainG: MultiGraph) {
    const { HNUpField, userHiers } = this.settings;
    const upFields = getFields(userHiers, "up");

    hierarchyNotesArr.forEach((hnItem, i) => {
      const upField = hnItem.field ?? (HNUpField || upFields[0]);
      const downField =
        getOppFields(userHiers, upField)[0] ?? `${upField}<down>`;

      if (hnItem.parentNote === null) {
        const s = hnItem.currNote;
        const t = hierarchyNotesArr[i + 1]?.currNote;

        //@ts-ignore
        addNodesIfNot(mainG, [s, t], { dir: "down", field: downField });
        //@ts-ignore
        addEdgeIfNot(mainG, s, t, { dir: "down", field: downField });
      } else {
        const aUp = {
          dir: "up",
          field: upField,
        };
        //@ts-ignore
        addNodesIfNot(mainG, [hnItem.currNote, hnItem.parentNote], aUp);
        //@ts-ignore
        addEdgeIfNot(mainG, hnItem.currNote, hnItem.parentNote, aUp);

        const aDown = {
          dir: "down",
          field: downField,
        };
        //@ts-ignore
        addNodesIfNot(mainG, [hnItem.parentNote, hnItem.currNote], aDown);
        //@ts-ignore
        addEdgeIfNot(mainG, hnItem.parentNote, hnItem.currNote, aDown);
      }
    });
  }

  addJugglLinksToGraph(
    jugglLinks: JugglLink[],
    frontms: dvFrontmatterCache[],
    mainG: MultiGraph
  ) {
    jugglLinks.forEach((jugglLink) => {
      const { basename } = jugglLink.file;
      jugglLink.links.forEach((link) => {
        const { dir, field, linksInLine } = link;
        if (dir === "") return;
        const sourceOrder = this.getTargetOrder(frontms, basename);
        linksInLine.forEach((linkInLine) => {
          const targetsOrder = this.getTargetOrder(frontms, linkInLine);

          this.populateMain(
            mainG,
            basename,
            dir,
            field,
            linkInLine,
            sourceOrder,
            targetsOrder
          );
        });
      });
    });
  }

  /** Use Folder Notes Plugin's FNs as BC-folder-notes */
  addFolderNotePluginToGraph() {
    const api = getApi(this);
    api.getFolderNote;
  }

  addFolderNotesToGraph(frontms: dvFrontmatterCache[], mainG: MultiGraph) {
    const { userHiers } = this.settings;
    const upFields = getFields(userHiers, "up");
    frontms.forEach((frontm) => {
      const folderNoteFile = frontm.file;
      if (frontm["BC-folder-note"]) {
        const folderNoteBasename = getDVBasename(folderNoteFile);
        const folder = getFolder(folderNoteFile);

        const sources = frontms
          .map((ff) => ff.file)
          .filter(
            (file) =>
              getFolder(file) === folder && file.path !== folderNoteFile.path
          )
          .map(getDVBasename);

        let field = frontm["BC-folder-note-up"];
        if (typeof field !== "string" || !upFields.includes(field)) {
          field = upFields[0];
        }

        const oppField =
          getOppFields(userHiers, field as string)[0] ??
          getFields(userHiers, "down")[0];
        if (!oppField) return;

        sources.forEach((source) => {
          // This is getting the order of the folder note, not the source pointing up to it
          const sourceOrder = parseInt(frontm.order as string) ?? 9999;
          const targetOrder = this.getTargetOrder(frontms, folderNoteBasename);
          this.populateMain(
            mainG,
            source,
            "up",
            field as string,
            folderNoteBasename,
            sourceOrder,
            targetOrder,
            { oppDir: "down", oppField }
          );
        });
      }
    });
  }

  addTagNotesToGraph(frontms: dvFrontmatterCache[], mainG: MultiGraph) {
    const { userHiers } = this.settings;
    const upFields = getFields(userHiers, "up");
    frontms.forEach((frontm) => {
      const tagNoteFile = frontm.file;
      if (frontm["BC-tag-note"]) {
        const tagNoteBasename = getDVBasename(tagNoteFile);
        const tag = (frontm["BC-tag-note"] as string).trim();
        if (!tag.startsWith("#")) return;

        const sources = frontms
          .map((ff) => ff.file)
          .filter(
            (file) =>
              file.path !== tagNoteFile.path &&
              this.app.metadataCache
                .getFileCache(file)
                ?.tags?.map((t) => t.tag)
                .some((t) => t.includes(tag))
          )
          .map(getDVBasename);

        let field = frontm["BC-tag-note-up"];
        if (typeof field !== "string" || !upFields.includes(field)) {
          field = upFields[0];
        }

        const oppField =
          getOppFields(userHiers, field as string)[0] ??
          getFields(userHiers, "down")[0];
        if (!oppField) return;

        sources.forEach((source) => {
          // This is getting the order of the folder note, not the source pointing up to it
          const sourceOrder = parseInt(frontm.order as string) ?? 9999;
          const targetOrder = this.getTargetOrder(frontms, tagNoteBasename);
          this.populateMain(
            mainG,
            source,
            "up",
            field as string,
            tagNoteBasename,
            sourceOrder,
            targetOrder,
            { oppDir: "down", oppField }
          );
        });
      }
    });
  }

  addLinkNotesToGraph(frontms: dvFrontmatterCache[], mainG: MultiGraph) {
    const { userHiers } = this.settings;
    frontms.forEach((frontm) => {
      const linkNoteFile = frontm.file;
      if (frontm["BC-link-note"]) {
        const linkNoteBasename = getDVBasename(linkNoteFile);

        let field = frontm["BC-link-note"] as string;
        const { fieldDir } = getFieldInfo(userHiers, field as string);
        if (
          typeof field !== "string" ||
          (fieldDir !== undefined &&
            !getFields(userHiers, fieldDir).includes(field))
        ) {
          field = getFields(userHiers, fieldDir)[0];
        }
        const dir = getFieldInfo(userHiers, field as string).fieldDir;
        const oppField =
          getOppFields(userHiers, field as string)[0] ??
          getFields(userHiers, "down")[0];
        if (!oppField) return;

        const targets = this.app.metadataCache
          .getFileCache(linkNoteFile)
          ?.links.map((l) => l.link.match(/[^#|]+/)[0]);

        // This is getting the order of the folder note, not the source pointing up to it
        for (const target of targets) {
          const sourceOrder = parseInt(frontm.order as string) ?? 9999;
          const targetOrder = this.getTargetOrder(frontms, linkNoteBasename);
          this.populateMain(
            mainG,
            linkNoteBasename,
            dir,
            field as string,
            target,
            sourceOrder,
            targetOrder,
            { oppDir: getOppDir(dir), oppField }
          );
        }
      }
    });
  }

  getTargetOrder = (frontms: dvFrontmatterCache[], target: string) =>
    parseInt(
      frontms.find((arr) => arr.file.basename === target)?.order as string
    ) ?? 9999;

  async initGraphs(): Promise<MultiGraph> {
    try {
      const { settings, app, db } = this;
      db.start2G("initGraphs");
      const files = app.vault.getMarkdownFiles();
      const dvQ = !!app.plugins.enabledPlugins.has("dataview");

      let frontms: dvFrontmatterCache[] = dvQ
        ? this.getDVMetadataCache(files)
        : this.getObsMetadataCache(files);

      const mainG = new MultiGraph();
      if (frontms[0] === undefined) {
        db.end2G();
        new Notice("Breadcrumbs cache not initialised yet - Refresh Index.");
        return mainG;
      }

      const { userHiers } = settings;
      if (userHiers.length === 0) {
        db.end2G();
        new Notice("You do not have any Breadcrumbs hierarchies set up.");
        return mainG;
      }

      const useCSV = settings.CSVPaths !== "";
      const CSVRows = useCSV ? await this.getCSVRows() : [];

      db.start2G("addFrontmatterToGraph");
      frontms.forEach((frontm) => {
        const basename = getDVBasename(frontm.file);
        iterateHiers(userHiers, (hier, dir, field) => {
          const values = this.parseFieldValue(frontm[field]);
          const sourceOrder = parseInt(frontm.order as string) ?? 9999;

          values.forEach((target) => {
            const targetOrder = this.getTargetOrder(frontms, target);
            this.populateMain(
              mainG,
              basename,
              dir,
              field,
              target,
              sourceOrder,
              targetOrder
            );
          });
          if (useCSV) this.addCSVCrumbs(mainG, CSVRows, dir, field);
        });
      });
      db.end2G();

      // SECTION  Juggl Links
      const jugglLinks =
        app.plugins.plugins.juggl || settings.parseJugglLinksWithoutJuggl
          ? await this.getJugglLinks(files)
          : [];

      if (jugglLinks.length)
        this.addJugglLinksToGraph(jugglLinks, frontms, mainG);

      // !SECTION  Juggl Links
      // SECTION  Hierarchy Notes
      db.start2G("Hierarchy Notes");

      const hierarchyNotesArr: HierarchyNoteItem[] = [];
      if (settings.hierarchyNotes[0] !== "") {
        for (const note of settings.hierarchyNotes) {
          const file = app.metadataCache.getFirstLinkpathDest(note, "");
          if (file) {
            hierarchyNotesArr.push(...(await this.getHierarchyNoteItems(file)));
          } else {
            new Notice(
              `${note} is no longer in your vault. It is best to remove it in Breadcrumbs settings.`
            );
          }
        }
      }

      if (hierarchyNotesArr.length)
        this.addHNsToGraph(hierarchyNotesArr, mainG);

      db.end2G({ hierarchyNotesArr });
      // !SECTION  Hierarchy Notes

      console.time("Folder-Notes");
      this.addFolderNotesToGraph(frontms, mainG);
      console.timeEnd("Folder-Notes");
      console.time("Tag-Notes");
      this.addTagNotesToGraph(frontms, mainG);
      console.timeEnd("Tag-Notes");
      console.time("Link-Notes");
      this.addLinkNotesToGraph(frontms, mainG);
      console.timeEnd("Link-Notes");

      files.forEach((file) => {
        const { basename } = file;
        addNodesIfNot(mainG, [basename]);
      });
      db.end2G("graphs inited", { mainG });
      return mainG;
    } catch (err) {
      error(err);
      this.db.end2G();
    }
  }

  // !SECTION OneSource

  dfsAllPaths(g: Graph, startNode: string): string[][] {
    const queue: { node: string; path: string[] }[] = [
      { node: startNode, path: [] },
    ];
    const visited = [];
    const allPaths: string[][] = [];

    let i = 0;
    while (queue.length > 0 && i < 1000) {
      i++;
      const { node, path } = queue.shift();

      const extPath = [node, ...path];
      const succsNotVisited = g.hasNode(node)
        ? g.filterOutNeighbors(node, (n, a) => !visited.includes(n))
        : [];
      const newItems = succsNotVisited.map((n) => {
        return { node: n, path: extPath };
      });

      visited.push(...succsNotVisited);
      queue.unshift(...newItems);

      // if (!g.hasNode(node) || !g.outDegree(node))
      allPaths.push(extPath);
    }
    return allPaths;
  }

  createIndex(allPaths: string[][]): string {
    let index = "";
    const { wikilinkIndex, aliasesInIndex } = this.settings;
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

          if (aliasesInIndex) {
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

  // SECTION Breadcrumbs

  bfsAllPaths(g: Graph, startNode: string): string[][] {
    const pathsArr: string[][] = [];
    const queue: { node: string; path: string[] }[] = [
      { node: startNode, path: [] },
    ];

    let i = 0;
    while (queue.length !== 0 && i < 1000) {
      i++;
      const { node, path } = queue.shift();
      const extPath = [node, ...path];

      const succs = g.hasNode(node)
        ? g.filterOutNeighbors(node, (n) => !path.includes(n))
        : [];
      for (const node of succs) {
        queue.push({ node, path: extPath });
      }

      // terminal node
      if (!g.hasNode(node) || succs.length === 0) {
        pathsArr.push(extPath);
      }
    }
    // Splice off the current note from the path
    pathsArr.forEach((path) => {
      if (path.length) path.splice(path.length - 1, 1);
    });
    info({ pathsArr });
    return pathsArr;
  }

  getdfsFromNode(g: MultiGraph, node: string) {
    dfsFromNode(g, node, (node, a, depth) => {
      console.log({ node, a, depth });
    });
  }

  getBreadcrumbs(g: Graph, currFile: TFile): string[][] | null {
    const { basename, extension } = currFile;
    if (extension !== "md") return null;

    const allTrails: string[][] = this.bfsAllPaths(g, basename);
    let filteredTrails = [...allTrails];

    const { indexNotes } = this.settings;
    // Filter for index notes
    if (indexNotes[0] !== "" && filteredTrails[0].length > 0) {
      filteredTrails = filteredTrails.filter((trail) =>
        indexNotes.includes(trail[0])
      );
      if (
        filteredTrails.length === 0 &&
        this.settings.showAllPathsIfNoneToIndexNote
      )
        filteredTrails = [...allTrails];
    }

    const sortedTrails = filteredTrails
      .filter((trail) => trail.length > 0)
      .sort((a, b) => a.length - b.length);

    info({ sortedTrails });
    return sortedTrails;
  }

  getLimitedTrailSub() {
    const { limitTrailCheckboxStates, userHiers } = this.settings;
    let subGraph: MultiGraph;

    if (Object.values(limitTrailCheckboxStates).every((val) => val)) {
      subGraph = getSubInDirs(this.mainG, "up", "down");
    } else {
      const positiveFields = Object.keys(limitTrailCheckboxStates).filter(
        (field) => limitTrailCheckboxStates[field]
      );
      const oppFields = positiveFields
        .map((field) => getOppFields(userHiers, field)[0])
        .filter((field) => field !== undefined);
      subGraph = getSubForFields(this.mainG, [...positiveFields, ...oppFields]);
    }

    const closed = getReflexiveClosure(subGraph, userHiers);
    return getSubInDirs(closed, "up");
  }

  async drawTrail(): Promise<void> {
    try {
      const { settings, db } = this;
      const {
        showBCs,
        noPathMessage,
        respectReadableLineLength,
        showTrail,
        showGrid,
        showPrevNext,
        showBCsInEditLPMode,
      } = settings;
      db.start2G("drawTrail");
      const activeMDView = this.app.workspace.getActiveViewOfType(MarkdownView);
      const mode = activeMDView?.getMode();
      if (
        !showBCs ||
        !activeMDView ||
        (mode !== "preview" && !showBCsInEditLPMode)
      ) {
        db.end2G();
        return;
      }

      const { file } = activeMDView;
      const { frontmatter } = this.app.metadataCache.getFileCache(file) ?? {};

      // @ts-ignore
      const { hideTrailField } = settings;
      if (hideTrailField && frontmatter?.[hideTrailField]) {
        new Notice(
          `${file.basename} still uses an old frontmatter field to hide it's trail. This settings has been deprecated in favour of a standardised field: 'BC-hide-trail'. Please change it so that this note's trail is hidden again.`
        );
      }
      if (frontmatter?.["BC-hide-trail"] || frontmatter?.["kanban-plugin"]) {
        db.end2G();
        return;
      }

      let view: HTMLElement;
      let livePreview: boolean = false;
      if (mode === "preview") {
        view = activeMDView.previewMode.containerEl.querySelector(
          "div.markdown-preview-view"
        );
      } else {
        view = activeMDView.contentEl.querySelector("div.markdown-source-view");
        if (view.hasClass("is-live-preview")) {
          livePreview = true;
        }
      }

      activeMDView.containerEl
        .querySelectorAll(".BC-trail")
        ?.forEach((trail) => trail.remove());

      const closedUp = this.getLimitedTrailSub();
      const sortedTrails = this.getBreadcrumbs(closedUp, file);
      info({ sortedTrails });

      const { basename } = file;

      const {
        next: { reals: rNext, implieds: iNext },
        prev: { reals: rPrev, implieds: iPrev },
      } = getRealnImplied(this, basename, "next");

      // Remove duplicate implied
      const next = [...rNext];
      iNext.forEach((i) => {
        if (next.findIndex((n) => n.to === i.to) === -1) {
          next.push(i);
        }
      });
      const prev = [...rPrev];
      iPrev.forEach((i) => {
        if (prev.findIndex((n) => n.to === i.to) === -1) {
          prev.push(i);
        }
      });

      const noItems =
        sortedTrails.length === 0 && next.length === 0 && prev.length === 0;

      if (noItems && noPathMessage === "") {
        db.end2G();
        return;
      }

      const selectorForMaxWidth =
        mode === "preview"
          ? ".markdown-preview-view.is-readable-line-width .markdown-preview-sizer"
          : "";

      const elForMaxWidth =
        selectorForMaxWidth !== ""
          ? document.querySelector(selectorForMaxWidth)
          : null;
      const max_width = elForMaxWidth
        ? getComputedStyle(elForMaxWidth).getPropertyValue("max-width")
        : "100%";

      const trailDiv = createDiv({
        cls: `BC-trail ${
          respectReadableLineLength
            ? "is-readable-line-width markdown-preview-sizer markdown-preview-section"
            : ""
        }`,
        attr: {
          style:
            (mode !== "preview" ? `max-width: ${max_width};` : "") +
            "margin: 0 auto",
        },
      });

      this.visited.push([file.path, trailDiv]);

      if (mode === "preview") {
        view.querySelector("div.markdown-preview-sizer").before(trailDiv);
      } else {
        const cmEditor = view.querySelector("div.cm-editor");
        const cmSizer = view.querySelector("div.CodeMirror-sizer");
        if (cmEditor) cmEditor.firstChild?.before(trailDiv);
        if (cmSizer) cmSizer.before(trailDiv);
      }

      trailDiv.empty();

      if (noItems) {
        trailDiv.innerText = noPathMessage;
        db.end2G();
        return;
      }

      const props = { sortedTrails, app: this.app, plugin: this };

      if (showTrail && sortedTrails.length) {
        new TrailPath({
          target: trailDiv,
          props,
        });
      }
      if (showGrid && sortedTrails.length) {
        new TrailGrid({
          target: trailDiv,
          props,
        });
      }
      if (showPrevNext && (next.length || prev.length)) {
        new NextPrev({
          target: trailDiv,
          props: { app: this.app, plugin: this, next, prev },
        });
      }
      db.end2G();
    } catch (err) {
      error(err);
      this.db.end2G();
    }
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  onunload(): void {
    console.log("unloading");
    VIEWS.forEach((view) => this.app.workspace.detachLeavesOfType(view.type));

    this.visited.forEach((visit) => visit[1].remove());
  }
}
