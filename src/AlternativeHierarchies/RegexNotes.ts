import type { MultiGraph } from "graphology";
import { info } from "loglevel";
import type BCPlugin from "../main";
import { BC_REGEX_NOTE, BC_REGEX_NOTE_FIELD } from "../constants";
import { getSourceOrder, getTargetOrder, populateMain } from "../graphUtils";
import type { dvFrontmatterCache } from "../interfaces";
import { getDVBasename, getFields, strToRegex } from "../sharedFunctions";

export function addRegexNotesToGraph(
  plugin: BCPlugin,
  eligableAlts: dvFrontmatterCache[],
  frontms: dvFrontmatterCache[],
  mainG: MultiGraph
) {
  const { settings } = plugin;
  const { userHiers, regexNoteField } = settings;
  const fields = getFields(userHiers);

  eligableAlts.forEach((altFile) => {
    const regexNoteFile = altFile.file;
    const regexNoteBasename = getDVBasename(regexNoteFile);

    const regex = strToRegex(altFile[BC_REGEX_NOTE] as string);
    info({ regex });

    let field = altFile[BC_REGEX_NOTE_FIELD] as string;
    if (typeof field !== "string" || !fields.includes(field))
      field = regexNoteField || fields[0];

    const targets = [];
    frontms.forEach((page) => {
      const basename = getDVBasename(page.file);
      if (basename !== regexNoteBasename && regex.test(basename))
        targets.push(basename);
    });

    for (const target of targets) {
      const sourceOrder = getSourceOrder(altFile);
      const targetOrder = getTargetOrder(frontms, regexNoteBasename);
      populateMain(
        settings,
        mainG,
        regexNoteBasename,
        field,
        target,
        sourceOrder,
        targetOrder,
        true
      );
    }
  });
}
