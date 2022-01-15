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
    const { file } = frontm;
    const basename = getDVBasename(file);

    const splits = basename.split(dendronNoteDelimiter);
    if (splits.length < 2) continue;

    // Probably inefficient to reverse then unreverse it. I can probably just use slice(-i)
    const reversed = splits.reverse();
    reversed.forEach((split, i) => {
      const currSlice = reversed.slice(i).reverse().join(dendronNoteDelimiter);
      const nextSlice = reversed
        .slice(i + 1)
        .reverse()
        .join(dendronNoteDelimiter);
      if (!nextSlice) return;

      const sourceOrder = getSourceOrder(frontm);
      const targetOrder = getTargetOrder(frontms, nextSlice);

      populateMain(
        settings,
        mainG,
        currSlice,
        dendronNoteField,
        nextSlice,
        sourceOrder,
        targetOrder,
        true
      );
    });
  }
}
