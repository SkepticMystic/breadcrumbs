import type { MultiGraph } from "graphology";
import type { dvFrontmatterCache } from "../interfaces";
import type BCPlugin from "../main";
import { populateMain } from "../Utils/graphUtils";
import { getDVBasename } from "../Utils/ObsidianUtils";
import * as luxon from "luxon";

export function addDateNotesToGraph(
  plugin: BCPlugin,
  frontms: dvFrontmatterCache[],
  mainG: MultiGraph
) {
  const { settings } = plugin;
  const {
    addDateNotes,
    dateNoteAddMonth,
    dateNoteAddYear,
    dateNoteFormat,
    dateNoteField,
  } = settings;
  if (!addDateNotes) return;

  const { regex } = luxon.DateTime.fromFormatExplain("", dateNoteFormat);
  frontms.forEach((page) => {
    const { file } = page;
    const { day } = file;
    if (!day || !regex.test(getDVBasename(file))) return;

    const today = getDVBasename(file);
    const tomorrow = day.plus({ days: 1 });
    const tomStr = tomorrow.toFormat(dateNoteFormat);

    populateMain(
      settings,
      mainG,
      today,
      dateNoteField,
      tomStr,
      9999,
      9999,
      true
    );
  });
}
