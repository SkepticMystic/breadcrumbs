import { cloneDeep } from "lodash";
import { info } from "loglevel";
import { copy } from "obsidian-community-lib/dist/utils";
import { makeWiki } from "./sharedFunctions";
import {
  dfsAllPaths,
  getReflexiveClosure,
  getSinks,
  getSubCloseSub,
  getSubInDirs,
} from "./graphUtils";
import type BCPlugin from "./main";

/**
 * Returns a copy of `index`, doesn't mutate.
 * @param  {string} index
 */
export function addAliasesToIndex(plugin: BCPlugin, index: string) {
  const { aliasesInIndex } = plugin.settings;
  const copy = index.slice();
  const lines = copy.split("\n");
  for (let line of lines) {
    if (aliasesInIndex) {
      const note = line.split("- ")[1];
      if (!note) continue;
      const currFile = plugin.app.metadataCache.getFirstLinkpathDest(note, "");

      if (currFile !== null) {
        const cache = plugin.app.metadataCache.getFileCache(currFile);

        const alias: string[] = cache?.frontmatter?.alias ?? [];
        const aliases: string[] = cache?.frontmatter?.aliases ?? [];

        const allAliases: string[] = [...[alias].flat(3), ...[aliases].flat(3)];
        if (allAliases.length) {
          line += ` (${allAliases.join(", ")})`;
        }
      }
    }
  }
  return lines.join("\n");
}

/**
 * Create an index of all the paths in the graph.
 * @param allPaths - A list of all paths from the root to the leaves.
 * @param {boolean} asWikilinks - Whether to use wikilinks instead of plain text.
 * @returns A string.
 */
export function createIndex(
  allPaths: string[][],
  asWikilinks: boolean
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

export async function copyLocalIndex(plugin: BCPlugin) {
  const { settings, mainG } = plugin;
  const { userHiers, wikilinkIndex } = settings;
  const { basename } = plugin.app.workspace.getActiveFile();

  const onlyDowns = getSubCloseSub(mainG, userHiers, "down", "up");

  const allPaths = dfsAllPaths(onlyDowns, basename);
  const index = addAliasesToIndex(plugin, createIndex(allPaths, wikilinkIndex));
  info({ index });
  await copy(index);
}

export async function copyGlobalIndex(plugin: BCPlugin) {
  const { mainG, settings } = plugin;
  const { userHiers, wikilinkIndex } = settings;

  const g = getSubInDirs(mainG, "up", "down");
  const closed = getReflexiveClosure(g, userHiers);
  const onlyDowns = getSubInDirs(closed, "down");
  const onlyUps = getSubInDirs(closed, "up");

  const sinks = getSinks(onlyUps);

  let globalIndex = "";
  sinks.forEach((terminal) => {
    globalIndex += terminal + "\n";
    const allPaths = dfsAllPaths(onlyDowns, terminal);
    globalIndex +=
      addAliasesToIndex(plugin, createIndex(allPaths, wikilinkIndex)) + "\n";
  });

  info({ globalIndex });
  await copy(globalIndex);
}
