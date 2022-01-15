import { Notice } from "obsidian";
import { getRealnImplied } from "./sharedFunctions";
import type { Directions } from "./interfaces";
import type BCPlugin from "./main";

export async function jumpToFirstDir(plugin: BCPlugin, dir: Directions) {
  const { limitJumpToFirstFields } = plugin.settings;
  const file = plugin.app.workspace.getActiveFile();
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

  const toFile = plugin.app.metadataCache.getFirstLinkpathDest(toNode, "");
  await plugin.app.workspace.activeLeaf.openFile(toFile);
}
