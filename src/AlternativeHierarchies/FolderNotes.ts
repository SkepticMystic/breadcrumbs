import type { MultiGraph } from "graphology";
import { TFile, TFolder } from "obsidian";
import { BC_FOLDER_NOTE, BC_FOLDER_NOTE_RECURSIVE } from "../constants";
import type { dvFrontmatterCache } from "../interfaces";
import type BCPlugin from "../main";
import {
  getSourceOrder,
  getTargetOrder,
  populateMain,
} from "../Utils/graphUtils";
import { getFields } from "../Utils/HierUtils";
import { getDVBasename, getFolderName } from "../Utils/ObsidianUtils";

const getSubsFromFolder = (folder: TFolder) => {
  const otherNotes: TFile[] = [],
    subFolders: TFolder[] = [];
  folder.children.forEach((tAbstract) => {
    if (tAbstract instanceof TFile) {
      otherNotes.push(tAbstract);
    } else subFolders.push(tAbstract as TFolder);
  });
  return { otherNotes, subFolders };
};

export function addFolderNotesToGraph(
  plugin: BCPlugin,
  folderNotes: dvFrontmatterCache[],
  frontms: dvFrontmatterCache[],
  mainG: MultiGraph
) {
  const { settings, app } = plugin;
  const { userHiers } = settings;
  const fields = getFields(userHiers);
  folderNotes.forEach((altFile) => {
    const { file } = altFile;
    const basename = getDVBasename(file);
    const topFolderName = getFolderName(file);
    const topFolder = app.vault.getAbstractFileByPath(topFolderName) as TFolder;

    const targets = frontms
      .map((ff) => ff.file)
      .filter(
        (other) =>
          getFolderName(other) === topFolderName && other.path !== file.path
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

    if (altFile[BC_FOLDER_NOTE_RECURSIVE]) {
      const { subFolders } = getSubsFromFolder(topFolder);
      const folderQueue: TFolder[] = [...subFolders];
      console.log({ startingQueue: folderQueue.slice() });

      let currFolder = folderQueue.shift();
      while (currFolder !== undefined) {
        const { otherNotes, subFolders } = getSubsFromFolder(currFolder);

        const folderNote = currFolder.name;
        const targets = otherNotes.map(getDVBasename);

        // if (!isInVault(app, folderNote, folderNote)) continue;

        const sourceOrder = 9999; // getSourceOrder(altFile);
        const targetOrder = 9999; //  getTargetOrder(frontms, basename);

        const parentFolderNote = currFolder.parent.name;

        populateMain(
          settings,
          mainG,
          parentFolderNote,
          field,
          folderNote,
          sourceOrder,
          targetOrder,
          true
        );

        targets.forEach((target) => {
          if (target === folderNote) return;
          console.log("adding", folderNote, "→", target);
          const sourceOrder = 9999; // getSourceOrder(altFile);
          const targetOrder = 9999; //  getTargetOrder(frontms, basename);

          populateMain(
            settings,
            mainG,
            folderNote,
            field,
            target,
            sourceOrder,
            targetOrder,
            true
          );
        });

        folderQueue.push(...subFolders);
        currFolder = folderQueue.shift();
      }
    }

    // First add otherNotes to graph

    // Then iterate subFolders doing the same
  });
}
