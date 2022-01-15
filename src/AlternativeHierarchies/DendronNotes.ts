import type { MultiGraph } from "graphology";
import { BC_IGNORE_DENDRON } from "../constants";
import { getSourceOrder, getTargetOrder, populateMain } from "../graphUtils";
import type { dvFrontmatterCache } from "../interfaces";
import type BCPlugin from "../main";
import { getDVBasename } from "../sharedFunctions";

export function addDendronNotesToGraph(
  plugin: BCPlugin,
  frontms: dvFrontmatterCache[],
  mainG: MultiGraph
) {
  const { settings } = plugin;
  const { addDendronNotes, dendronNoteDelimiter, dendronNoteField } = settings;
  if (!addDendronNotes) return;

  for (const frontm of frontms) {
    // Doesn't currently work yet
    if (frontm[BC_IGNORE_DENDRON]) continue;

    const basename = getDVBasename(frontm.file);

    const splits = basename.split(dendronNoteDelimiter);
    if (splits.length <= 1) continue;

    const nextSlice = splits.slice(0, -1).join(dendronNoteDelimiter);
    if (!nextSlice) continue;
    const nextSliceFile = frontms.find(
      (fm) => getDVBasename(fm.file) === nextSlice
    );

    if (!nextSliceFile || nextSliceFile[BC_IGNORE_DENDRON]) continue;

    const sourceOrder = getSourceOrder(frontm);
    const targetOrder = getTargetOrder(frontms, nextSlice);

    populateMain(
      settings,
      mainG,
      basename,
      dendronNoteField,
      nextSlice,
      sourceOrder,
      targetOrder,
      true
    );
  }
}
