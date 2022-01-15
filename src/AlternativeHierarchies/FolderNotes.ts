import type { MultiGraph } from "graphology";
import { BC_FOLDER_NOTE, BC_FOLDER_NOTE_SUBFOLDER } from "../constants";
import { getSourceOrder, getTargetOrder, populateMain } from "../graphUtils";
import type { BCSettings, dvFrontmatterCache } from "../interfaces";
import { getDVBasename, getFields, getFolder } from "../sharedFunctions";

export function addFolderNotesToGraph(
  settings: BCSettings,
  eligableAlts: dvFrontmatterCache[],
  frontms: dvFrontmatterCache[],
  mainG: MultiGraph
) {
  const { userHiers } = settings;
  const fields = getFields(userHiers);
  eligableAlts.forEach((altFile) => {
    const { file } = altFile;
    const basename = getDVBasename(file);
    const folder = getFolder(file);
    const subfolders = altFile[BC_FOLDER_NOTE_SUBFOLDER];

    const targets = frontms
      .map((ff) => ff.file)
      .filter(
        (other) =>
          (subfolders
            ? getFolder(other).includes(folder)
            : getFolder(other) === folder) && other.path !== file.path
      )
      .map(getDVBasename);

    const field = altFile[BC_FOLDER_NOTE] as string;
    if (typeof field !== "string" || !fields.includes(field)) return;

    targets.forEach((target) => {
      // This is getting the order of the folder note, not the source pointing up to it
      const sourceOrder = getSourceOrder(altFile);
      const targetOrder = getTargetOrder(frontms, basename);
      populateMain(
        settings,
        mainG,
        basename,
        field,
        target,
        sourceOrder,
        targetOrder,
        true
      );
    });
  });
}
