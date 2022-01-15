import type { MultiGraph } from "graphology";
import { parseTypedLink } from "juggl-api";
import { debug, error } from "loglevel";
import type { Pos, TFile } from "obsidian";
import { dropHeaderOrAlias, splitLinksRegex } from "./constants";
import { getFieldInfo, getTargetOrder, populateMain } from "./graphUtils";
import type {
  BCSettings,
  dvFrontmatterCache,
  dvLink,
  JugglLink,
  RawValue,
} from "./interfaces";
import type BCPlugin from "./main";
import { getBaseFromMDPath, getFields } from "./sharedFunctions";

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

// TODO I think it'd be better to do this whole thing as an obj instead of JugglLink[]
// => {[note: string]: {type: string, linksInLine: string[]}[]}
export async function getJugglLinks(
  plugin: BCPlugin,
  files: TFile[]
): Promise<JugglLink[]> {
  const { settings, app, db } = plugin;
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

export function addJugglLinksToGraph(
  settings: BCSettings,
  jugglLinks: JugglLink[],
  frontms: dvFrontmatterCache[],
  mainG: MultiGraph
) {
  jugglLinks.forEach((jugglLink) => {
    const { basename } = jugglLink.file;
    jugglLink.links.forEach((link) => {
      const { dir, field, linksInLine } = link;
      if (dir === "") return;
      const sourceOrder = getTargetOrder(frontms, basename);
      linksInLine.forEach((linkInLine) => {
        // Is this a bug? Why not `getSourceOrder`?
        const targetsOrder = getTargetOrder(frontms, linkInLine);

        populateMain(
          settings,
          mainG,
          basename,
          field,
          linkInLine,
          sourceOrder,
          targetsOrder
        );
      });
    });
  });
}
