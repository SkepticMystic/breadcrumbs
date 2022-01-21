import type { MultiGraph } from "graphology";
import { parseTypedLink } from "juggl-api";
import type { TFile } from "obsidian";
import { splitLinksRegex } from "../constants";
import type { BCSettings, dvFrontmatterCache, JugglLink } from "../interfaces";
import type BCPlugin from "../main";
import { getTargetOrder, populateMain } from "../Utils/graphUtils";
import { getFieldInfo, getFields } from "../Utils/HierUtils";

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
