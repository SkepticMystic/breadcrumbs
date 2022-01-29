import type { MultiGraph } from "graphology";
import { Notice } from "obsidian";
import { BC_DV_NOTE, BC_DV_NOTE_FIELD, DATAVIEW_MISSING } from "../constants";
import type { dvFrontmatterCache } from "../interfaces";
import type BCPlugin from "../main";
import {
  getSourceOrder,
  getTargetOrder,
  populateMain,
} from "../Utils/graphUtils";
import { getFields } from "../Utils/HierUtils";
import { getDVApi, getDVBasename } from "../Utils/ObsidianUtils";

export function addDataviewNotesToGraph(
  plugin: BCPlugin,
  eligableAlts: dvFrontmatterCache[],
  frontms: dvFrontmatterCache[],
  mainG: MultiGraph
) {
  const { settings } = plugin;
  const { userHiers, dataviewNoteField } = settings;
  const dv = getDVApi(plugin);
  if (!dv) {
    new Notice(DATAVIEW_MISSING);
  }

  const fields = getFields(userHiers);

  eligableAlts.forEach((altFile) => {
    const basename = getDVBasename(altFile.file);
    const query = altFile[BC_DV_NOTE] as string;

    let field =
      (altFile[BC_DV_NOTE_FIELD] as string) ?? (dataviewNoteField || fields[0]);

    let targets: dvFrontmatterCache[] = [];
    try {
      targets = dv.pages(query).values;
    } catch (er) {
      new Notice(`${query} is not a valid Dataview from-query`);
      console.log(er);
    }

    for (const target of targets) {
      const targetBN = getDVBasename(target.file);
      const sourceOrder = getSourceOrder(altFile);
      const targetOrder = getTargetOrder(frontms, targetBN);

      populateMain(
        settings,
        mainG,
        basename,
        field,
        targetBN,
        sourceOrder,
        targetOrder,
        true
      );
    }
  });
}
