import { Notice } from "obsidian";
import type { Directions } from "../interfaces";
import type BCPlugin from "../main";
import { getRealnImplied } from "../Utils/graphUtils";
import {getCurrFile} from "../Utils/ObsidianUtils";

export async function jumpToFirstDir(plugin: BCPlugin, dir: Directions) {
  const { limitJumpToFirstFields } = plugin.settings;
  const file = getCurrFile();
  if (!file) {
    new Notice("You need to be focussed on a Markdown file");
    return;
  }
  const { basename } = file;

  const realsNImplieds = getRealnImplied(plugin, basename, dir)[dir];
  const allBCs = [...realsNImplieds.reals, ...realsNImplieds.implieds];
  if (allBCs.length === 0) {
    new Notice(`No ${dir} found`);
    return;
  }

  const toNode = allBCs.find((bc) =>
    limitJumpToFirstFields.includes(bc.field)
  )?.to;

  if (!toNode) {
    new Notice(
      `No note was found in ${dir} given the limited fields allowed: ${limitJumpToFirstFields.join(
        ", "
      )}`
    );
    return;
  }

  const toFile = app.metadataCache.getFirstLinkpathDest(toNode, "");
  await app.workspace.activeLeaf.openFile(toFile);
}
