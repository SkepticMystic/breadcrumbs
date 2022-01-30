import type { MultiGraph } from "graphology";
import type { dvFrontmatterCache } from "../interfaces";
import type BCPlugin from "../main";
import { populateMain } from "../Utils/graphUtils";
import { getDVBasename } from "../Utils/ObsidianUtils";

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

  frontms.forEach((page) => {
    const { day } = page.file;
    if (!day) return;

    const today = getDVBasename(page.file);
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
