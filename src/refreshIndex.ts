import { MultiGraph } from "graphology";
import { debug, error, warn } from "loglevel";
import { Notice, Pos, TFile } from "obsidian";
import { wait } from "obsidian-community-lib";
import { drawTrail } from "./Views/TrailView";
import { addCSVCrumbs, getCSVRows } from "./AlternativeHierarchies/CSVCrumbs";
import { addDendronNotesToGraph } from "./AlternativeHierarchies/DendronNotes";
import { addFolderNotesToGraph } from "./AlternativeHierarchies/FolderNotes";
import {
  addHNsToGraph,
  getHierarchyNoteItems,
} from "./AlternativeHierarchies/HierarchyNotes/HierarchyNotes";
import {
  addJugglLinksToGraph,
  getJugglLinks,
} from "./AlternativeHierarchies/JugglLinks";
import { addLinkNotesToGraph } from "./AlternativeHierarchies/LinkNotes";
import { addRegexNotesToGraph } from "./AlternativeHierarchies/RegexNotes";
import { addTagNotesToGraph } from "./AlternativeHierarchies/TagNotes";
import { addTraverseNotesToGraph } from "./AlternativeHierarchies/TraverseNotes";
import {
  BC_ALTS,
  BC_FOLDER_NOTE,
  BC_LINK_NOTE,
  BC_REGEX_NOTE,
  BC_TAG_NOTE,
  BC_TRAVERSE_NOTE,
  dropHeaderOrAlias,
  splitLinksRegex,
} from "./constants";
import {
  addEdgeIfNot,
  addNodesIfNot,
  buildObsGraph,
  getReflexiveClosure,
  getSourceOrder,
  getTargetOrder,
  populateMain,
} from "./graphUtils";
import type {
  BCSettings,
  dvFrontmatterCache,
  dvLink,
  RawValue,
} from "./interfaces";
import type BCPlugin from "./main";
import {
  getBaseFromMDPath,
  getDVBasename,
  iterateHiers,
} from "./sharedFunctions";

export function getDVMetadataCache(plugin: BCPlugin, files: TFile[]) {
  const { app, db } = plugin;
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

export function getObsMetadataCache(plugin: BCPlugin, files: TFile[]) {
  const { app, db } = plugin;
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

/**
 * Keep unwrapping a proxied item until it isn't one anymore
 * @param  {RawValue} item
 */
export function unproxy(item: RawValue) {
  const unproxied = [];

  const queue = [item];
  while (queue.length) {
    const currItem = queue.shift();
    // @ts-ignore
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
export function parseFieldValue(
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
        const unProxied = unproxy(rawItem);
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

export async function buildMainG(plugin: BCPlugin): Promise<MultiGraph> {
  const mainG = new MultiGraph();
  try {
    const { settings, app, db } = plugin;
    db.start2G("initGraphs");
    const files = app.vault.getMarkdownFiles();
    const dvQ = !!app.plugins.enabledPlugins.has("dataview");

    let frontms: dvFrontmatterCache[] = dvQ
      ? getDVMetadataCache(plugin, files)
      : getObsMetadataCache(plugin, files);

    if (frontms.some((frontm) => frontm === undefined)) {
      await wait(2000);
      frontms = dvQ
        ? getDVMetadataCache(plugin, files)
        : getObsMetadataCache(plugin, files);
    }

    const { userHiers } = settings;
    if (userHiers.length === 0) {
      db.end2G();
      new Notice("You do not have any Breadcrumbs hierarchies set up.");
      return mainG;
    }

    const useCSV = settings.CSVPaths !== "";
    const CSVRows = useCSV ? await getCSVRows(plugin) : [];

    const eligableAlts: { [altField: string]: dvFrontmatterCache[] } = {};
    BC_ALTS.forEach((alt) => (eligableAlts[alt] = []));

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
      const sourceOrder = getSourceOrder(frontm);

      iterateHiers(userHiers, (hier, dir, field) => {
        const values = parseFieldValue(frontm[field]);

        values.forEach((target) => {
          if (
            (target.startsWith("<%") && target.endsWith("%>")) ||
            (target.startsWith("{{") && target.endsWith("}}"))
          )
            return;
          const targetOrder = getTargetOrder(frontms, target);

          populateMain(
            settings,
            mainG,
            basename,
            field,
            target,
            sourceOrder,
            targetOrder
          );
        });
        if (useCSV) addCSVCrumbs(mainG, CSVRows, dir, field);
      });
    });

    db.end2G();

    // SECTION  Juggl Links
    const jugglLinks =
      app.plugins.plugins.juggl || settings.parseJugglLinksWithoutJuggl
        ? await getJugglLinks(plugin, files)
        : [];

    if (jugglLinks.length)
      addJugglLinksToGraph(settings, jugglLinks, frontms, mainG);

    // !SECTION  Juggl Links

    // SECTION  Hierarchy Notes
    db.start2G("Hierarchy Notes");

    if (settings.hierarchyNotes[0] !== "") {
      for (const note of settings.hierarchyNotes) {
        const file = app.metadataCache.getFirstLinkpathDest(note, "");
        if (file) {
          addHNsToGraph(
            settings,
            await getHierarchyNoteItems(plugin, file),
            mainG
          );
        } else {
          new Notice(
            `${note} is no longer in your vault. It is best to remove it in Breadcrumbs settings.`
          );
        }
      }
    }

    db.end2G();
    // !SECTION  Hierarchy Notes
    db.start1G("Alternative Hierarchies");

    addFolderNotesToGraph(plugin, eligableAlts[BC_FOLDER_NOTE], frontms, mainG);
    addTagNotesToGraph(plugin, eligableAlts[BC_TAG_NOTE], frontms, mainG);
    addLinkNotesToGraph(plugin, eligableAlts[BC_LINK_NOTE], frontms, mainG);
    addRegexNotesToGraph(plugin, eligableAlts[BC_REGEX_NOTE], frontms, mainG);
    // plugin.addNamingSystemNotesToGraph(frontms, mainG);
    addTraverseNotesToGraph(
      plugin,
      eligableAlts[BC_TRAVERSE_NOTE],
      mainG,
      buildObsGraph(app)
    );
    addDendronNotesToGraph(plugin, frontms, mainG);

    db.end1G();

    files.forEach((file) => {
      const { basename } = file;
      addNodesIfNot(mainG, [basename]);
    });
    db.end2G("graphs inited", { mainG });
    return mainG;
  } catch (err) {
    error(err);
    plugin.db.end2G();
    return mainG;
  }
}

function addSiblingsFromSameParent(g: MultiGraph) {
  g.forEachNode((n, a) => {
    g.forEachOutEdge(n, (k, a, s, t) => {
      if (a.dir !== "up") return;

      g.forEachOutEdge(t, (k, a, s, t) => {
        if (a.dir !== "down" || s === n) return;

        addEdgeIfNot(g, n, t, {
          dir: "same",
          // field: ...
        });
      });
    });
  });
}
function addSiblingsFromSiblings(g: MultiGraph) {}

export function buildClosedG(plugin: BCPlugin) {
  const { mainG, settings } = plugin;
  const { userHiers } = settings;

  const reflexClosed = getReflexiveClosure(mainG, userHiers);

  return reflexClosed;
}

export async function refreshIndex(plugin: BCPlugin) {
  if (!plugin.activeLeafChange) plugin.registerActiveLeafChangeEvent();
  if (!plugin.layoutChange) plugin.registerLayoutChangeEvent();

  plugin.mainG = await buildMainG(plugin);
  plugin.closedG = buildClosedG(plugin);

  for (const { type } of plugin.VIEWS)
    await plugin.getActiveTYPEView(type)?.draw();

  if (plugin.settings.showBCs) await drawTrail(plugin);
  if (plugin.settings.showRefreshNotice) new Notice("Index refreshed");
}
