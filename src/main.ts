import { getApi } from "@aidenlx/folder-note-core";
import Graph, { MultiGraph } from "graphology";
import { parseTypedLink } from "juggl-api";
import { cloneDeep } from "lodash";
import { debug, error, info, warn } from "loglevel";
import {
  addIcon,
  EventRef,
  MarkdownView,
  normalizePath,
  Notice,
  Plugin,
  Pos,
  TFile,
} from "obsidian";
import {
  addFeatherIcon,
  copy,
  openView,
  wait,
  waitForResolvedLinks,
} from "obsidian-community-lib/dist/utils";
import { Debugger } from "src/Debugger";
import { BCSettingTab } from "./BreadcrumbsSettingTab";
import NextPrev from "./Components/NextPrev.svelte";
import TrailGrid from "./Components/TrailGrid.svelte";
import TrailPath from "./Components/TrailPath.svelte";
import {
  BC_ALTS,
  BC_FOLDER_NOTE,
  BC_HIDE_TRAIL,
  BC_LINK_NOTE,
  BC_ORDER,
  BC_TAG_NOTE,
  BC_TAG_NOTE_FIELD,
  BC_TRAVERSE_NOTE,
  DEFAULT_SETTINGS,
  DOWN_VIEW,
  dropHeaderOrAlias,
  DUCK_ICON,
  DUCK_ICON_SVG,
  DUCK_VIEW,
  MATRIX_VIEW,
  splitLinksRegex,
  STATS_VIEW,
  TRAIL_ICON,
  TRAIL_ICON_SVG,
} from "./constants";
import DownView from "./DownView";
import DucksView from "./DucksView";
import { FieldSuggestor } from "./FieldSuggestor";
import {
  addEdgeIfNot,
  addNodesIfNot,
  dfsAllPaths,
  getFieldInfo,
  getOppDir,
  getOppFields,
  getReflexiveClosure,
  getSinks,
  getSubForFields,
  getSubInDirs,
  removeCycles,
} from "./graphUtils";
import { HierarchyNoteSelectorModal } from "./HierNoteModal";
import type {
  BCSettings,
  Directions,
  dvFrontmatterCache,
  dvLink,
  HierarchyNoteItem,
  JugglLink,
  MyView,
  RawValue,
  ViewInfo,
} from "./interfaces";
import MatrixView from "./MatrixView";
import {
  createOrUpdateYaml,
  dropWikilinks,
  fallbackOppField,
  getBaseFromMDPath,
  getDVBasename,
  getFields,
  getFolder,
  getRealnImplied,
  iterateHiers,
  makeWiki,
  splitAtYaml,
} from "./sharedFunctions";
import StatsView from "./StatsView";
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
  VIEWS: ViewInfo[];

  async refreshIndex() {
    if (!this.activeLeafChange) this.registerActiveLeafChangeEvent();
    if (!this.layoutChange) this.registerLayoutChangeEvent();
    this.mainG = await this.initGraphs();
    for (const view of this.VIEWS)
      await this.getActiveTYPEView(view.type)?.draw();
    if (this.settings.showBCs) await this.drawTrail();
    if (this.settings.showRefreshNotice) new Notice("Index refreshed");
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

  async waitForCache() {
    if (this.app.plugins.enabledPlugins.has("dataview")) {
      let basename: string;
      while (
        !basename ||
        !this.app.plugins.plugins.dataview.api.page(basename)
      ) {
        await wait(100);
        basename = this.app?.workspace?.getActiveFile()?.basename;
      }
    } else {
      await waitForResolvedLinks(this.app);
    }
  }

  async onload(): Promise<void> {
    console.log("loading breadcrumbs plugin");

    await this.loadSettings();
    const { settings } = this;

    if (typeof settings.debugMode === "boolean") {
      settings.debugMode = settings.debugMode ? "DEBUG" : "WARN";
      await this.saveSettings();
    }

    // Prevent breaking change
    //@ts-ignore
    const { userHierarchies } = settings;
    if (userHierarchies !== undefined && userHierarchies.length > 0) {
      settings.userHiers = userHierarchies;
      //@ts-ignore
      delete settings.userHierarchies;
      await this.saveSettings();
    }

    ["prev", "next"].forEach((dir) => {
      settings.userHiers.forEach(async (hier, i) => {
        if (hier[dir] === undefined) settings.userHiers[i][dir] = [];
        await this.saveSettings();
      });
    });

    if (settings.hasOwnProperty("limitTrailCheckboxStates")) {
      //@ts-ignore
      delete settings.limitTrailCheckboxStates;
      await this.saveSettings();
    }
    if (settings.hasOwnProperty("limitWriteBCCheckboxStates")) {
      //@ts-ignore
      delete settings.limitWriteBCCheckboxStates;
      await this.saveSettings();
    }

    if (!settings.CHECKBOX_STATES_OVERWRITTEN) {
      const fields = getFields(settings.userHiers);
      settings.limitWriteBCCheckboxes = fields;
      settings.limitJumpToFirstFields = fields;
      settings.limitTrailCheckboxes = getFields(settings.userHiers, "up");
      settings.CHECKBOX_STATES_OVERWRITTEN = true;
      await this.saveSettings();
    }

    this.VIEWS = [
      {
        plain: "Matrix",
        type: MATRIX_VIEW,
        constructor: MatrixView,
        openOnLoad: settings.openMatrixOnLoad,
      },
      {
        plain: "Stats",
        type: STATS_VIEW,
        constructor: StatsView,
        openOnLoad: settings.openStatsOnLoad,
      },
      {
        plain: "Duck",
        type: DUCK_VIEW,
        constructor: DucksView,
        openOnLoad: settings.openDuckOnLoad,
      },
      {
        plain: "Down",
        type: DOWN_VIEW,
        constructor: DownView,
        openOnLoad: settings.openDownOnLoad,
      },
    ];

    this.db = new Debugger(this);
    this.registerEditorSuggest(new FieldSuggestor(this));

    for (const { constructor, type } of this.VIEWS) {
      this.registerView(type, (leaf) => new constructor(leaf, this));
    }
    addIcon(DUCK_ICON, DUCK_ICON_SVG);
    addIcon(TRAIL_ICON, TRAIL_ICON_SVG);

    await this.waitForCache();
    this.mainG = await this.initGraphs();

    this.app.workspace.onLayoutReady(async () => {
      const noFiles = this.app.vault.getMarkdownFiles().length;
      if (this.mainG?.nodes().length < noFiles) {
        await wait(3000);
        this.mainG = await this.initGraphs();
      }

      for (const { openOnLoad, type, constructor } of this.VIEWS) {
        if (openOnLoad) await openView(this.app, type, constructor);
      }

      if (settings.showBCs) await this.drawTrail();
      this.registerActiveLeafChangeEvent();
      this.registerLayoutChangeEvent();
    });

    for (const { type, plain, constructor } of this.VIEWS) {
      this.addCommand({
        id: `show-${type}-view`,
        name: `Open ${plain} View`,
        //@ts-ignore
        checkCallback: async (checking: boolean) => {
          if (checking) {
            return this.app.workspace.getLeavesOfType(type).length === 0;
          }
          await openView(this.app, type, constructor);
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
      id: "manipulate-hierarchy-notes",
      name: "Adjust Hierarchy Notes",
      callback: () => new HierarchyNoteSelectorModal(this.app, this).open(),
    });

    this.addCommand({
      id: "Refresh-Breadcrumbs-Index",
      name: "Refresh Breadcrumbs Index",
      callback: async () => await this.refreshIndex(),
    });

    this.addCommand({
      id: "Toggle-trail-in-Edit&LP",
      name: "Toggle: Show Trail/Grid in Edit & LP mode",
      callback: async () => {
        settings.showBCsInEditLPMode = !settings.showBCsInEditLPMode;
        await this.saveSettings();
        await this.drawTrail();
      },
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
      checkCallback: () => settings.showWriteAllBCsCmd,
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

        const allPaths = dfsAllPaths(onlyDowns, basename);
        const index = this.addAliasesToIndex(this.createIndex(allPaths));
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
          const allPaths = dfsAllPaths(onlyDowns, terminal);
          globalIndex +=
            this.addAliasesToIndex(this.createIndex(allPaths)) + "\n";
        });

        info({ globalIndex });
        await copy(globalIndex);
      },
    });

    ["up", "down", "next", "prev"].forEach((dir: Directions) => {
      this.addCommand({
        id: `jump-to-first-${dir}`,
        name: `Jump to first '${dir}'`,
        callback: async () => {
          const file = this.app.workspace.getActiveFile();
          if (!file) {
            new Notice("You need to be focussed on a Markdown file");
            return;
          }
          const { basename } = file;

          const realsNImplieds = getRealnImplied(this, basename, dir)[dir];
          const allBCs = [...realsNImplieds.reals, ...realsNImplieds.implieds];
          if (allBCs.length === 0) {
            new Notice(`No ${dir} found`);
            return;
          }

          const toNode = allBCs.find((bc) =>
            settings.limitJumpToFirstFields.includes(bc.field)
          )?.to;

          if (!toNode) {
            new Notice(
              `No note was found in ${dir} given the limited fields allowed: ${settings.limitJumpToFirstFields.join(
                ", "
              )}`
            );
            return;
          }

          const toFile = this.app.metadataCache.getFirstLinkpathDest(
            toNode,
            ""
          );
          await this.app.workspace.activeLeaf.openFile(toFile);
        },
      });
    });

    this.addRibbonIcon(
      addFeatherIcon("tv") as string,
      "Breadcrumbs Visualisation",
      () => new VisModal(this.app, this).open()
    );

    this.addSettingTab(new BCSettingTab(this.app, this));
  }

  writeBCToFile = async (file: TFile) => {
    const { app, settings, mainG } = this;
    const { limitWriteBCCheckboxes, writeBCsInline, userHiers } = settings;

    const { frontmatter } = app.metadataCache.getFileCache(file);
    const api = app.plugins.plugins.metaedit?.api;

    if (!api) {
      new Notice("Metaedit must be enabled for this function to work");
      return;
    }

    const succInfo = mainG.mapInEdges(file.basename, (k, a, s, t) => {
      const oppField =
        getOppFields(userHiers, a.field)[0] ?? fallbackOppField(a.field, a.dir);
      return { succ: s, field: oppField };
    });

    for (const { succ, field } of succInfo) {
      if (!limitWriteBCCheckboxes.includes(field)) return;

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
    const { constructor } = this.VIEWS.find((view) => view.type === type);
    const leaves = this.app.workspace.getLeavesOfType(type);
    if (leaves && leaves.length >= 1) {
      const { view } = leaves[0];
      if (view instanceof constructor) return view;
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
      const note = dropWikiLinksReg.exec(afterBulletCurr)[1];
      let field = fieldReg.exec(afterBulletCurr)[1].trim() || null;

      // Ensure fieldName is one of the existing up fields. `null` if not
      if (field !== null && !upFields.includes(field)) {
        problemFields.push(field);
        field = null;
      }

      const { parent } = item;
      if (parent >= 0) {
        const parentNote = lines[parent];
        const afterBulletParent = afterBulletReg.exec(parentNote)[1];
        const dropWikiParent = dropWikiLinksReg.exec(afterBulletParent)[1];

        hierarchyNoteItems.push({
          note,
          parent: dropWikiParent,
          field,
        });
      } else {
        hierarchyNoteItems.push({
          note,
          parent: null,
          field,
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
    field: string,
    target: string,
    sourceOrder: number,
    targetOrder: number,
    fillOpp = false
  ): void {
    const { userHiers } = this.settings;
    const dir = getFieldInfo(userHiers, field).fieldDir;

    addNodesIfNot(mainG, [source], {
      order: sourceOrder,
    });

    addNodesIfNot(mainG, [target], {
      order: targetOrder,
    });

    addEdgeIfNot(mainG, source, target, {
      dir,
      field,
    });
    if (fillOpp) {
      const oppDir = getOppDir(dir);
      const oppField =
        getOppFields(userHiers, field)[0] ?? getFields(userHiers, oppDir)[0];
      addEdgeIfNot(mainG, target, source, {
        dir: oppDir,
        field: oppField,
      });
    }
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
        .map((head) => dropWikilinks(head.trim()))
        .forEach((item, i) => {
          rowObj[headers[i]] = item;
        });
      debug({ rowObj });
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
      addNodesIfNot(g, [row.file]);
      if (field === "" || !row[field]) return;

      addNodesIfNot(g, [row[field]]);
      addEdgeIfNot(g, row.file, row[field], { dir, field });
    });
  }

  buildObsGraph(): MultiGraph {
    const ObsG = new MultiGraph();
    const { resolvedLinks, unresolvedLinks } = this.app.metadataCache;

    for (const source in resolvedLinks) {
      if (!source.endsWith(".md")) continue;
      const sourceBase = getBaseFromMDPath(source);
      addNodesIfNot(ObsG, [sourceBase]);

      for (const dest in resolvedLinks[source]) {
        if (!dest.endsWith(".md")) continue;
        const destBase = getBaseFromMDPath(dest);
        addNodesIfNot(ObsG, [destBase]);
        ObsG.addEdge(sourceBase, destBase, { resolved: true });
      }
    }

    for (const source in unresolvedLinks) {
      const sourceBase = getBaseFromMDPath(source);
      addNodesIfNot(ObsG, [sourceBase]);

      for (const dest in unresolvedLinks[source]) {
        const destBase = getBaseFromMDPath(dest);
        addNodesIfNot(ObsG, [destBase]);
        if (sourceBase === destBase) continue;
        ObsG.addEdge(sourceBase, destBase, { resolved: false });
      }
    }

    info({ ObsG });
    return ObsG;
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
      if (typeof currItem.defaultComparator === "function") {
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
            getBaseFromMDPath(link.match(dropHeaderOrAlias)[1])
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
                  getBaseFromMDPath(link.match(dropHeaderOrAlias)[1])
                );
                parsed.push(...strs);
              } else {
                const basename = getBaseFromMDPath(rawAsString);
                parsed.push(basename.split("#")[0].split("|")[0]);
              }
            } else if (value.path !== undefined) {
              const basename = getBaseFromMDPath(value.path);
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
          if (field === "") return;
          const { fieldDir } = getFieldInfo(userHiers, field) || {};
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

  addHNsToGraph(hnArr: HierarchyNoteItem[], mainG: MultiGraph) {
    const { HNUpField, userHiers } = this.settings;
    const upFields = getFields(userHiers, "up");

    hnArr.forEach((hnItem, i) => {
      const { note, field, parent } = hnItem;
      const upField = field ?? (HNUpField || upFields[0]);
      const downField =
        getOppFields(userHiers, upField)[0] ?? fallbackOppField(upField, "up");

      if (parent === null) {
        const s = note;
        const t = hnArr[i + 1]?.note;

        addNodesIfNot(mainG, [s, t]);
        addEdgeIfNot(mainG, s, t, { dir: "down", field: downField });
      } else {
        addNodesIfNot(mainG, [note, parent]);
        addEdgeIfNot(mainG, note, parent, {
          dir: "up",
          field: upField,
        });

        // I don't think this needs to be done if the reverse is done above
        addNodesIfNot(mainG, [parent, note]);
        addEdgeIfNot(mainG, parent, note, {
          dir: "down",
          field: downField,
        });
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
            // dir,
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

  addFolderNotesToGraph(
    eligableAlts: dvFrontmatterCache[],
    frontms: dvFrontmatterCache[],
    mainG: MultiGraph
  ) {
    const { userHiers } = this.settings;
    const fields = getFields(userHiers);
    eligableAlts.forEach((altFile) => {
      const { file } = altFile;
      const basename = getDVBasename(file);
      const folder = getFolder(file);

      const targets = frontms
        .map((ff) => ff.file)
        .filter(
          (otherFile) =>
            getFolder(otherFile) === folder && otherFile.path !== file.path
        )
        .map(getDVBasename);

      const field = altFile[BC_FOLDER_NOTE] as string;
      if (typeof field !== "string" || !fields.includes(field)) return;

      targets.forEach((target) => {
        // This is getting the order of the folder note, not the source pointing up to it
        const sourceOrder = this.getSourceOrder(altFile);
        const targetOrder = this.getTargetOrder(frontms, basename);
        this.populateMain(
          mainG,
          basename,
          field,
          target,
          sourceOrder,
          targetOrder,
          true
        );
      });
    });
  }

  addTagNotesToGraph(
    eligableAlts: dvFrontmatterCache[],
    frontms: dvFrontmatterCache[],
    mainG: MultiGraph
  ) {
    const { userHiers } = this.settings;
    const fields = getFields(userHiers);
    eligableAlts.forEach((altFile) => {
      const tagNoteFile = altFile.file;

      const tagNoteBasename = getDVBasename(tagNoteFile);
      const tag = (altFile[BC_TAG_NOTE] as string).trim();
      if (!tag.startsWith("#")) return;

      const hasThisTag = (file: TFile): boolean => {
        const cache = this.app.metadataCache.getFileCache(file);
        return (
          cache?.tags?.map((t) => t.tag).some((t) => t.includes(tag)) ||
          cache?.frontmatter?.tags?.includes(tag.slice(1)) ||
          cache?.frontmatter?.tag?.includes(tag.slice(1))
        );
      };

      const targets = frontms
        .map((ff) => ff.file)
        .filter((file) => file.path !== tagNoteFile.path && hasThisTag(file))
        .map(getDVBasename);

      let field = altFile[BC_TAG_NOTE_FIELD] as string;
      if (typeof field !== "string" || !fields.includes(field))
        field = fields[0];

      targets.forEach((target) => {
        const sourceOrder = this.getSourceOrder(altFile);
        const targetOrder = this.getTargetOrder(frontms, tagNoteBasename);
        this.populateMain(
          mainG,
          tagNoteBasename,
          field,
          target,
          sourceOrder,
          targetOrder,
          true
        );
      });
    });
  }

  addLinkNotesToGraph(
    eligableAlts: dvFrontmatterCache[],
    frontms: dvFrontmatterCache[],
    mainG: MultiGraph
  ) {
    const { userHiers } = this.settings;
    eligableAlts.forEach((altFile) => {
      const linkNoteFile = altFile.file;
      const linkNoteBasename = getDVBasename(linkNoteFile);

      let field = altFile[BC_LINK_NOTE] as string;
      if (typeof field !== "string" || !getFields(userHiers).includes(field))
        return;

      const links = this.app.metadataCache
        .getFileCache(linkNoteFile)
        ?.links?.map((l) => l.link.match(/[^#|]+/)[0]);

      const embeds = this.app.metadataCache
        .getFileCache(linkNoteFile)
        ?.embeds?.map((l) => l.link.match(/[^#|]+/)[0]);

      const targets = [...(links ?? []), ...(embeds ?? [])];

      for (const target of targets) {
        const sourceOrder = this.getSourceOrder(altFile);
        const targetOrder = this.getTargetOrder(frontms, linkNoteBasename);
        this.populateMain(
          mainG,
          linkNoteBasename,
          field,
          target,
          sourceOrder,
          targetOrder,
          true
        );
      }
    });
  }

  addTraverseNotesToGraph(
    traverseNotes: dvFrontmatterCache[],
    frontms: dvFrontmatterCache[],
    mainG: MultiGraph,
    obsG: MultiGraph
  ) {
    const { userHiers } = this.settings;
    traverseNotes.forEach((altFile) => {
      const { file } = altFile;
      const basename = getDVBasename(file);
      const noCycles = removeCycles(obsG, basename);

      let field = altFile[BC_TRAVERSE_NOTE] as string;
      if (typeof field !== "string" || !getFields(userHiers).includes(field))
        return;

      const allPaths = dfsAllPaths(noCycles, basename);
      info(allPaths);
      const reversed = [...allPaths].map((path) => path.reverse());
      reversed.forEach((path) => {
        path.forEach((node, i) => {
          const next = path[i + 1];
          if (next === undefined) return;
          this.populateMain(
            mainG,
            node,
            field as string,
            next,
            9999,
            9999,
            true
          );
        });
      });
    });
  }

  addDendronNotesToGraph(frontms: dvFrontmatterCache[], mainG: MultiGraph) {
    const { addDendronNotes, dendronNoteDelimiter, dendronNoteField } =
      this.settings;
    if (!addDendronNotes) return;

    for (const frontm of frontms) {
      const { file } = frontm;
      const basename = getDVBasename(file);

      const splits = basename.split(dendronNoteDelimiter);
      if (splits.length < 2) continue;

      // Probably inefficient to reverse then unreverse it. I can probably just use slice(-i)
      const reversed = splits.reverse();
      reversed.forEach((split, i) => {
        const currSlice = reversed
          .slice(i)
          .reverse()
          .join(dendronNoteDelimiter);
        const nextSlice = reversed
          .slice(i + 1)
          .reverse()
          .join(dendronNoteDelimiter);
        if (!nextSlice) return;

        const sourceOrder = this.getSourceOrder(frontm);
        const targetOrder = this.getTargetOrder(frontms, nextSlice);

        this.populateMain(
          mainG,
          currSlice,
          dendronNoteField,
          nextSlice,
          sourceOrder,
          targetOrder,
          true
        );
      });
    }
  }

  getTargetOrder = (frontms: dvFrontmatterCache[], target: string) =>
    parseInt(
      (frontms.find((arr) => arr.file.basename === target)?.[
        BC_ORDER
      ] as string) ?? "9999"
    );

  getSourceOrder = (frontm: dvFrontmatterCache) =>
    parseInt((frontm[BC_ORDER] as string) ?? "9999");

  async initGraphs(): Promise<MultiGraph> {
    const mainG = new MultiGraph();
    try {
      const { settings, app, db } = this;
      db.start2G("initGraphs");
      const files = app.vault.getMarkdownFiles();
      const dvQ = !!app.plugins.enabledPlugins.has("dataview");

      let frontms: dvFrontmatterCache[] = dvQ
        ? this.getDVMetadataCache(files)
        : this.getObsMetadataCache(files);

      if (frontms.some((frontm) => frontm === undefined)) {
        await wait(2000);
        frontms = dvQ
          ? this.getDVMetadataCache(files)
          : this.getObsMetadataCache(files);
        // db.end2G();
        // return mainG;
      }

      const { userHiers } = settings;
      if (userHiers.length === 0) {
        db.end2G();
        new Notice("You do not have any Breadcrumbs hierarchies set up.");
        return mainG;
      }

      const useCSV = settings.CSVPaths !== "";
      const CSVRows = useCSV ? await this.getCSVRows() : [];

      const eligableAlts: { [altField: string]: dvFrontmatterCache[] } = {};
      BC_ALTS.forEach((alt) => {
        eligableAlts[alt] = [];
      });

      function noticeIfBroken(frontm: dvFrontmatterCache): void {
        const basename = getDVBasename(frontm.file);
        // @ts-ignore
        if (frontm[BC_FOLDER_NOTE] === true) {
          const msg = `CONSOLE LOGGED: ${basename} is using a deprecated folder-note value. Instead of 'true', it now takes in the fieldName you want to use.`;
          new Notice(msg);
          warn(msg);
        }
        // @ts-ignore
        if (frontm[BC_LINK_NOTE] === true) {
          const msg = `CONSOLE LOGGED: ${basename} is using a deprecated link-note value. Instead of 'true', it now takes in the fieldName you want to use.`;
          new Notice(msg);
          warn(msg);
        }
        if (frontm["BC-folder-note-up"]) {
          const msg = `CONSOLE LOGGED: ${basename} is using a deprecated folder-note-up value. Instead of setting the fieldName here, it goes directly into 'BC-folder-note: fieldName'.`;
          new Notice(msg);
          warn(msg);
        }
      }

      db.start2G("addFrontmatterToGraph");
      frontms.forEach((frontm) => {
        BC_ALTS.forEach((alt) => {
          if (frontm[alt]) {
            eligableAlts[alt].push(frontm);
          }
        });

        noticeIfBroken(frontm);

        const basename = getDVBasename(frontm.file);
        const sourceOrder = this.getSourceOrder(frontm);

        iterateHiers(userHiers, (hier, dir, field) => {
          const values = this.parseFieldValue(frontm[field]);

          values.forEach((target) => {
            if (
              (target.startsWith("<%") && target.endsWith("%>")) ||
              (target.startsWith("{{") && target.endsWith("}}"))
            )
              return;
            const targetOrder = this.getTargetOrder(frontms, target);

            this.populateMain(
              mainG,
              basename,
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

      if (settings.hierarchyNotes[0] !== "") {
        for (const note of settings.hierarchyNotes) {
          const file = app.metadataCache.getFirstLinkpathDest(note, "");
          if (file) {
            this.addHNsToGraph(await this.getHierarchyNoteItems(file), mainG);
          } else {
            new Notice(
              `${note} is no longer in your vault. It is best to remove it in Breadcrumbs settings.`
            );
          }
        }
      }

      db.end2G();
      // !SECTION  Hierarchy Notes

      this.addFolderNotesToGraph(eligableAlts[BC_FOLDER_NOTE], frontms, mainG);
      this.addTagNotesToGraph(eligableAlts[BC_TAG_NOTE], frontms, mainG);
      this.addLinkNotesToGraph(eligableAlts[BC_LINK_NOTE], frontms, mainG);

      db.start1G("Traverse-Notes");

      this.addTraverseNotesToGraph(
        eligableAlts[BC_TRAVERSE_NOTE],
        frontms,
        mainG,
        this.buildObsGraph()
      );

      this.addDendronNotesToGraph(frontms, mainG);

      db.end1G();

      files.forEach((file) => {
        const { basename } = file;
        addNodesIfNot(mainG, [basename]);
      });
      db.end2G("graphs inited", { mainG });
      return mainG;
    } catch (err) {
      error(err);
      this.db.end2G();
      return mainG;
    }
  }

  // !SECTION OneSource

  createIndex(
    allPaths: string[][],
    asWikilinks: boolean = this.settings.wikilinkIndex
  ): string {
    let index = "";
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
            asWikilinks ? makeWiki(currNode) : currNode
          }`;

          index += "\n";

          if (!visited.hasOwnProperty(currNode)) visited[currNode] = [];
          visited[currNode].push(depth);
        }
      }
    });
    return index;
  }

  /**
   * Returns a copy of `index`, doesn't mutate.
   * @param  {string} index
   */
  addAliasesToIndex(index: string) {
    const { aliasesInIndex } = this.settings;
    const copy = index.slice();
    const lines = copy.split("\n");
    for (let line of lines) {
      if (aliasesInIndex) {
        const note = line.split("- ")[1];
        if (!note) continue;
        const currFile = this.app.metadataCache.getFirstLinkpathDest(note, "");

        if (currFile !== null) {
          const cache = this.app.metadataCache.getFileCache(currFile);

          const alias: string[] = cache?.frontmatter?.alias ?? [];
          const aliases: string[] = cache?.frontmatter?.aliases ?? [];

          const allAliases: string[] = [
            ...[alias].flat(3),
            ...[aliases].flat(3),
          ];
          if (allAliases.length) {
            line += ` (${allAliases.join(", ")})`;
          }
        }
      }
    }
    return lines.join("\n");
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

  getBreadcrumbs(g: Graph, currFile: TFile): string[][] | null {
    const { basename, extension } = currFile;
    if (extension !== "md") return null;

    const allTrails = this.bfsAllPaths(g, basename);
    let filteredTrails = [...allTrails];

    const { indexNotes, showAllPathsIfNoneToIndexNote } = this.settings;
    // Filter for index notes
    if (
      // Works for `undefined` and `""`
      indexNotes[0] &&
      filteredTrails.length
    ) {
      filteredTrails = filteredTrails.filter((trail) =>
        indexNotes.includes(trail[0])
      );
      if (filteredTrails.length === 0 && showAllPathsIfNoneToIndexNote)
        filteredTrails = [...allTrails];
    }

    const sortedTrails = filteredTrails
      .filter((trail) => trail.length > 0)
      .sort((a, b) => a.length - b.length);

    return sortedTrails;
  }

  getLimitedTrailSub() {
    const { limitTrailCheckboxes, userHiers } = this.settings;
    let subGraph: MultiGraph;

    if (
      getFields(userHiers).every((field) =>
        limitTrailCheckboxes.includes(field)
      )
    ) {
      subGraph = getSubInDirs(this.mainG, "up", "down");
    } else {
      const oppFields = limitTrailCheckboxes
        .map((field) => getOppFields(userHiers, field)[0])
        .filter((field) => field !== undefined);
      subGraph = getSubForFields(this.mainG, [
        ...limitTrailCheckboxes,
        ...oppFields,
      ]);
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
        activeMDView?.containerEl.querySelector(".BC-trail")?.remove();
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
      if (frontmatter?.[BC_HIDE_TRAIL] || frontmatter?.["kanban-plugin"]) {
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
        if (view.hasClass("is-live-preview")) livePreview = true;
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

      const noItems = !sortedTrails.length && !next.length && !prev.length;

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
        : "80%";

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
      if (settings.indexNotes.includes(basename)) {
        trailDiv.innerText = "Index Note";
        db.end2G();
        return;
      }

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
    this.VIEWS.forEach(async (view) => {
      // await this.getActiveTYPEView(view.type)?.close();
      this.app.workspace.detachLeavesOfType(view.type);
    });

    this.visited.forEach((visit) => visit[1].remove());
  }
}
