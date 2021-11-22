import Graph, { MultiGraph } from "graphology";
import { dfsFromNode } from "graphology-traversal";
import { parseTypedLink } from "juggl-api";
import { cloneDeep } from "lodash";
import {
  addIcon,
  EventRef,
  FrontMatterCache,
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
  wait,
} from "obsidian-community-lib/dist/utils";
import { BCSettingTab } from "src/BreadcrumbsSettingTab";
import {
  DEFAULT_SETTINGS,
  DIRECTIONS,
  dropHeaderOrAlias,
  MATRIX_VIEW,
  splitLinksRegex,
  TRAIL_ICON,
  TRAIL_ICON_SVG,
  VIEWS,
} from "src/constants";
import type {
  BCSettings,
  Directions,
  dvFrontmatterCache,
  dvLink,
  HierarchyNoteItem,
  JugglLink,
  MyView,
  RawValue,
} from "src/interfaces";
import {
  addEdgeIfNot,
  addNodesIfNot,
  createOrUpdateYaml,
  debugGroupEnd,
  debugGroupStart,
  getBasename,
  getFields,
  getInNeighbours,
  getOppFields,
  getRealnImplied,
  getReflexiveClosure,
  getSinks,
  getSubForFields,
  getSubInDirs,
  iterateHiers,
  makeWiki,
  splitAtYaml,
} from "src/sharedFunctions";
import { VisModal } from "src/VisModal";
import util from "util";
import NextPrev from "./Components/NextPrev.svelte";
import TrailGrid from "./Components/TrailGrid.svelte";
import TrailPath from "./Components/TrailPath.svelte";

export default class BCPlugin extends Plugin {
  settings: BCSettings;
  visited: [string, HTMLDivElement][] = [];
  refreshIntervalID: number;
  mainG: MultiGraph;
  activeLeafChange: EventRef = undefined;
  statusBatItemEl: HTMLElement = undefined;

  async refreshIndex() {
    if (!this.activeLeafChange) this.registerActiveLeafEvent();
    this.mainG = await this.initGraphs();
    for (const view of VIEWS) await this.getActiveTYPEView(view.type)?.draw();
    if (this.settings.showTrail) await this.drawTrail();
    new Notice("Index refreshed");
  }

  registerActiveLeafEvent() {
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

  initEverything = async () => {
    const { settings } = this;
    this.mainG = await this.initGraphs();

    for (const view of VIEWS) {
      if (view.openOnLoad)
        await openView(this.app, view.type, view.constructor);
    }

    if (settings.showBCs) await this.drawTrail();

    this.registerActiveLeafEvent();
  };

  async onload(): Promise<void> {
    console.log("loading breadcrumbs plugin");

    await this.loadSettings();

    // Prevent breaking change
    if (this.settings.hasOwnProperty("userHierarchies")) {
      this.settings.userHiers = this.settings.userHierarchies;
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
    // this.addCommand({
    //   id: "test-traversal",
    //   name: "Traverse",
    //   hotkeys: [{ key: "a", modifiers: ["Alt"] }],
    //   callback: () => {
    //     const { basename } = this.app.workspace.getActiveFile();
    //     const g = getSubInDirs(this.mainG, "up", "down");
    //     const closed = getReflexiveClosure(g, this.settings.userHiers);
    //     const onlyUps = getSubInDirs(closed, "up");

    //     this.getdfsFromNode(onlyUps, basename);
    //   },
    // });

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
              } catch (error) {
                new Notice(error);
                console.log(error);
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
        this.debug({ index });
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

        this.debug({ globalIndex });
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

  debug(log: any): void {
    if (this.settings.debugMode) console.log(log);
  }

  superDebug(log: any): void {
    if (this.settings.superDebugMode) console.log(log);
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
    const { settings, app } = this;
    debugGroupStart(settings, "debugMode", "getDVMetadataCache");
    this.debug("Using Dataview");
    debugGroupStart(settings, "superDebugMode", "dvCaches");

    const fileFrontmatterArr: dvFrontmatterCache[] = files.map((file) => {
      this.superDebug(`GetDVMetadataCache: ${file.basename}`);

      const dvCache: dvFrontmatterCache = app.plugins.plugins.dataview.api.page(
        file.path
      );

      this.superDebug({ dvCache });
      return dvCache;
    });

    debugGroupEnd(settings, "superDebugMode");
    this.debug({ fileFrontmatterArr });
    debugGroupEnd(settings, "debugMode");
    return fileFrontmatterArr;
  }

  getObsMetadataCache(files: TFile[]) {
    const { settings, app } = this;
    debugGroupStart(settings, "debugMode", "getObsMetadataCache");
    this.debug("Using Obsidian");
    debugGroupStart(settings, "superDebugMode", "obsCaches");

    const fileFrontmatterArr: dvFrontmatterCache[] = files.map((file) => {
      this.superDebug(`GetObsMetadataCache: ${file.basename}`);
      const obs: FrontMatterCache =
        app.metadataCache.getFileCache(file)?.frontmatter;
      this.superDebug({ obs });
      if (obs) return { file, ...obs };
      else return { file };
    });

    debugGroupEnd(settings, "superDebugMode");
    this.debug({ fileFrontmatterArr });
    debugGroupEnd(settings, "debugMode");
    return fileFrontmatterArr;
  }

  // SECTION OneSource

  populateMain(
    main: MultiGraph,
    basename: string,
    dir: Directions,
    field: string,
    targets: string[],
    sourceOrder: number,
    fileFrontmatterArr: dvFrontmatterCache[]
  ): void {
    addNodesIfNot(main, [basename], {
      //@ts-ignore
      dir,
      field,
      order: sourceOrder,
    });
    targets.forEach((target) => {
      const targetOrder =
        parseInt(
          fileFrontmatterArr.find((arr) => arr.file.basename === target)?.order
        ) ?? 9999;
      addNodesIfNot(main, [target], {
        //@ts-ignore
        dir,
        field,
        order: targetOrder,
      });
      addEdgeIfNot(main, basename, target, {
        //@ts-ignore
        dir,
        field,
      });
    });
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

    console.log({ CSVRows });
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
            getBasename(link.match(dropHeaderOrAlias)[1])
          );
          parsed.push(...linkNames);
        }
      } else {
        const rawValues: RawValue[] = [value].flat(4);

        this.superDebug(rawValues);

        rawValues.forEach((rawItem) => {
          if (!rawItem) return;
          const unProxied = this.unproxy(rawItem);
          unProxied.forEach((value) => {
            if (typeof value === "string" || typeof value === "number") {
              const rawAsString = value.toString();
              const splits = rawAsString.match(splitLinksRegex);
              if (splits !== null) {
                const strs = splits.map((link) =>
                  getBasename(link.match(dropHeaderOrAlias)[1])
                );
                parsed.push(...strs);
              } else parsed.push(getBasename(rawAsString));
            } else if (value.path !== undefined) {
              const basename = getBasename(value.path);
              if (basename !== undefined) parsed.push(basename);
            }
          });
        });
      }
      return parsed;
    } catch (error) {
      console.log(error);
      return parsed;
    }
  }

  // TODO I think it'd be better to do this whole thing as an obj instead of JugglLink[]
  // => {[note: string]: {type: string, linksInLine: string[]}[]}
  async getJugglLinks(files: TFile[]): Promise<JugglLink[]> {
    const { settings, app } = this;
    debugGroupStart(settings, "debugMode", "getJugglLinks");
    this.debug("Using Juggl");

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
          let typeDir: Directions | "" = "";
          DIRECTIONS.forEach((dir) => {
            userHiers.forEach((hier) => {
              if (hier[dir]?.includes(field)) {
                typeDir = dir;
                return;
              }
            });
          });

          jugglLink.links.push({
            dir: typeDir,
            field,
            linksInLine,
          });
        });
        return jugglLink;
      })
    );

    this.debug({ typedLinksArr });

    const allFields = getFields(userHiers);

    const filteredLinks = typedLinksArr.map((jugglLink) => {
      // Filter out links whose type is not in allFields
      jugglLink.links = jugglLink.links.filter((link) =>
        allFields.includes(link.field)
      );
      return jugglLink;
    });
    this.debug({ filteredLinks });
    debugGroupEnd(settings, "debugMode");
    return filteredLinks;
  }

  async initGraphs(): Promise<MultiGraph> {
    const { settings, app } = this;
    debugGroupStart(settings, "debugMode", "Initialise Graphs");
    const files = app.vault.getMarkdownFiles();
    const dvQ = !!app.plugins.enabledPlugins.has("dataview");

    let fileFrontmatterArr: dvFrontmatterCache[] = dvQ
      ? this.getDVMetadataCache(files)
      : this.getObsMetadataCache(files);

    if (fileFrontmatterArr[0] === undefined) {
      return new MultiGraph();
    }

    debugGroupStart(settings, "debugMode", "Hierarchy Note Adjacency List");

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
    debugGroupEnd(settings, "debugMode");

    const { userHiers } = settings;
    const mainG = new MultiGraph();

    const useCSV = settings.CSVPaths !== "";
    const CSVRows = useCSV ? await this.getCSVRows() : [];

    let jugglLinks: JugglLink[] = [];
    if (
      app.plugins.plugins.juggl !== undefined ||
      settings.parseJugglLinksWithoutJuggl
    ) {
      jugglLinks = await this.getJugglLinks(files);
    }

    fileFrontmatterArr.forEach((fileFrontmatter) => {
      const basename =
        fileFrontmatter.file.basename || fileFrontmatter.file.name;
      iterateHiers(userHiers, (hier, dir, field) => {
        const values = this.parseFieldValue(fileFrontmatter[field]);
        const sourceOrder = parseInt(fileFrontmatter.order) ?? 9999;
        this.populateMain(
          mainG,
          basename,
          dir,
          field,
          values,
          sourceOrder,
          fileFrontmatterArr
        );
        if (useCSV) this.addCSVCrumbs(mainG, CSVRows, dir, field);
      });
    });

    if (jugglLinks.length) {
      jugglLinks.forEach((jugglLink) => {
        const { basename } = jugglLink.file;
        jugglLink.links.forEach((link) => {
          const { dir, field, linksInLine } = link;
          if (dir === "") return;
          const sourceOrder =
            parseInt(
              fileFrontmatterArr.find((arr) => arr.file.basename === basename)
                ?.order
            ) ?? 9999;
          this.populateMain(
            mainG,
            basename,
            dir,
            field,
            linksInLine,
            sourceOrder,
            fileFrontmatterArr
          );
        });
      });
    }

    if (hierarchyNotesArr.length) {
      const { HNUpField } = settings;
      const upFields = getFields(userHiers, "up");

      hierarchyNotesArr.forEach((hnItem, i) => {
        const upField = hnItem.field ?? (HNUpField || upFields[0]);
        const downField =
          getOppFields(userHiers, upField)[0] ?? `${upField}<down>`;

        if (hnItem.parentNote === null) {
          const s = hnItem.currNote;
          const t = hierarchyNotesArr[i + 1].currNote;
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

    this.debug("graphs inited");
    this.debug({ mainG });

    debugGroupEnd(settings, "debugMode");
    files.forEach((file) => {
      const { basename } = file;
      addNodesIfNot(mainG, [basename]);
    });
    return mainG;
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
    const visited = [startNode];

    let i = 0;
    while (queue.length !== 0 && i < 1000) {
      i++;
      const { node, path } = queue.shift();
      const extPath = [node, ...path];

      const succsNotVisited = g.hasNode(node)
        ? g.filterOutNeighbors(node, (succ) => !visited.includes(succ))
        : [];
      for (const node of succsNotVisited) {
        visited.push(node);
        queue.push({ node, path: extPath });
      }

      // terminal node
      if (!g.hasNode(node) || succsNotVisited.length === 0) {
        pathsArr.push(extPath);
      }
    }
    // Splice off the current note from the path
    pathsArr.forEach((path) => {
      if (path.length) path.splice(path.length - 1, 1);
    });
    this.debug({ pathsArr });
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

    const { indexNotes } = this.settings;

    let allTrails: string[][] = this.bfsAllPaths(g, basename);

    // No index note chosen
    if (indexNotes[0] !== "" && allTrails[0].length > 0) {
      allTrails = allTrails.filter((trail) => indexNotes.includes(trail[0]));
    }
    const sortedTrails = allTrails
      .filter((trail) => trail.length > 0)
      .sort((a, b) => a.length - b.length);

    this.debug({ sortedTrails });
    return sortedTrails;
  }

  getLimitedTrailSub() {
    const { limitTrailCheckboxStates, userHiers } = this.settings;
    const upFields = getFields(userHiers, "up");
    const downFields = getFields(userHiers, "down");

    let subGraph: MultiGraph;

    if (Object.values(limitTrailCheckboxStates).every((val) => val)) {
      subGraph = getSubForFields(this.mainG, [...upFields, ...downFields]);
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
    return getSubForFields(closed, upFields);
  }

  async drawTrail(): Promise<void> {
    const { settings } = this;
    debugGroupStart(settings, "debugMode", "Draw Trail");

    const activeMDView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!settings.showBCs || !activeMDView) {
      debugGroupEnd(settings, "debugMode");
      return;
    }

    const currFile = activeMDView.file;
    const currMetadata = this.app.metadataCache.getFileCache(currFile);

    const previewView = activeMDView.contentEl.querySelector(
      ".markdown-preview-view"
    );
    previewView.querySelector("div.BC-trail")?.remove();
    if (currMetadata.frontmatter?.hasOwnProperty(settings.hideTrailField)) {
      debugGroupEnd(settings, "debugMode");
      return;
    }

    const frontm =
      this.app.metadataCache.getFileCache(currFile)?.frontmatter ?? {};
    if (frontm["kanban-plugin"]) {
      debugGroupEnd(settings, "debugMode");
      return;
    }

    const closedUp = this.getLimitedTrailSub();
    const sortedTrails = this.getBreadcrumbs(closedUp, currFile);
    this.debug({ sortedTrails });

    const { basename } = currFile;

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

    if (noItems && settings.noPathMessage === "") {
      debugGroupEnd(settings, "debugMode");
      return;
    }

    const trailDiv = createDiv({
      cls: `BC-trail ${
        settings.respectReadableLineLength
          ? "is-readable-line-width markdown-preview-sizer markdown-preview-section"
          : ""
      }`,
    });

    this.visited.push([currFile.path, trailDiv]);

    previewView.querySelector(".markdown-preview-sizer").before(trailDiv);

    trailDiv.empty();

    if (noItems) {
      trailDiv.innerText = settings.noPathMessage;
      debugGroupEnd(settings, "debugMode");
      return;
    }

    const props = { sortedTrails, app: this.app, plugin: this };

    if (settings.showTrail && sortedTrails.length) {
      new TrailPath({
        target: trailDiv,
        props,
      });
    }
    if (settings.showGrid && sortedTrails.length) {
      new TrailGrid({
        target: trailDiv,
        props,
      });
    }
    if (settings.showPrevNext && (next.length || prev.length)) {
      new NextPrev({
        target: trailDiv,
        props: { app: this.app, plugin: this, next, prev },
      });
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
