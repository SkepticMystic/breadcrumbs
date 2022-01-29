import type { MultiGraph } from "graphology";
import { BC_IGNORE_DENDRON } from "../constants";
import type { dvFrontmatterCache } from "../interfaces";
import type BCPlugin from "../main";
import {
  getSourceOrder,
  getTargetOrder,
  populateMain,
} from "../Utils/graphUtils";
import { getDVBasename } from "../Utils/ObsidianUtils";

const getDendronParent = (dendron: string, splitter: string) =>
  dendron.split(splitter).slice(0, -1).join(splitter);

export function addDendronNotesToGraph(
  plugin: BCPlugin,
  frontms: dvFrontmatterCache[],
  mainG: MultiGraph
) {
  const { settings } = plugin;
  const { addDendronNotes, dendronNoteDelimiter, dendronNoteField } = settings;
  if (!addDendronNotes) return;

  for (const frontm of frontms) {
    if (frontm[BC_IGNORE_DENDRON]) continue;

    let curr = getDVBasename(frontm.file);
    let parent = getDendronParent(curr, dendronNoteDelimiter);

    while (parent !== "") {
      const parentFile = frontms.find(
        (fm) => getDVBasename(fm.file) === parent
      );

      // !parentFile implies a "stub"
      if (!parentFile || parentFile[BC_IGNORE_DENDRON] !== true) {
        populateMain(
          settings,
          mainG,
          curr,
          dendronNoteField,
          parent,
          9999,
          9999,
          true
        );
      }
      curr = parent;
      parent = getDendronParent(parent, dendronNoteDelimiter);
    }
  }
}

// export function addDendronNotesToGraph(
//   plugin: BCPlugin,
//   frontms: dvFrontmatterCache[],
//   mainG: MultiGraph
// ) {
//   const { settings } = plugin;
//   const { addDendronNotes, dendronNoteDelimiter, dendronNoteField } = settings;
//   if (!addDendronNotes) return;

//   for (const frontm of frontms) {
//     if (frontm[BC_IGNORE_DENDRON]) continue;

//     const basename = getDVBasename(frontm.file);

//     const splits = basename.split(dendronNoteDelimiter);
//     if (splits.length <= 1) continue;

//     const nextSlice = splits.slice(0, -1).join(dendronNoteDelimiter);
//     if (!nextSlice) continue;
//     const nextSliceFile = frontms.find(
//       (fm) => getDVBasename(fm.file) === nextSlice
//     );

//     if (!nextSliceFile || nextSliceFile[BC_IGNORE_DENDRON]) continue;

//     const sourceOrder = getSourceOrder(frontm);
//     const targetOrder = getTargetOrder(frontms, nextSlice);

//     populateMain(
//       settings,
//       mainG,
//       basename,
//       dendronNoteField,
//       nextSlice,
//       sourceOrder,
//       targetOrder,
//       true
//     );
//   }
// }
