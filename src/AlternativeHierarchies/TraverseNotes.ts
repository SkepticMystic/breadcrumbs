import type { MultiGraph } from "graphology";
import { info } from "loglevel";
import { BC_TRAVERSE_NOTE } from "../constants";
import type { dvFrontmatterCache } from "../interfaces";
import type BCPlugin from "../main";
import { dfsAllPaths, populateMain, removeCycles } from "../Utils/graphUtils";
import { getFields } from "../Utils/HierUtils";
import { getDVBasename } from "../Utils/ObsidianUtils";

export function addTraverseNotesToGraph(
  plugin: BCPlugin,
  traverseNotes: dvFrontmatterCache[],
  mainG: MultiGraph,
  obsG: MultiGraph
) {
  const { settings } = plugin;
  const { userHiers } = settings;

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
        populateMain(
          settings,
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
