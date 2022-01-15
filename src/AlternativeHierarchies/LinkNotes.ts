import type { MultiGraph } from "graphology";
import { BC_LINK_NOTE } from "../constants";
import { getSourceOrder, getTargetOrder, populateMain } from "../graphUtils";
import type { dvFrontmatterCache } from "../interfaces";
import type BCPlugin from "../main";
import { getDVBasename, getFields } from "../sharedFunctions";

export function addLinkNotesToGraph(
  plugin: BCPlugin,
  eligableAlts: dvFrontmatterCache[],
  frontms: dvFrontmatterCache[],
  mainG: MultiGraph
) {
  const { app, settings } = plugin;
  const { userHiers } = settings;
  eligableAlts.forEach((altFile) => {
    const linkNoteFile = altFile.file;
    const linkNoteBasename = getDVBasename(linkNoteFile);

    let field = altFile[BC_LINK_NOTE] as string;
    if (typeof field !== "string" || !getFields(userHiers).includes(field))
      return;

    const links = app.metadataCache
      .getFileCache(linkNoteFile)
      ?.links?.map((l) => l.link.match(/[^#|]+/)[0]);

    const embeds = app.metadataCache
      .getFileCache(linkNoteFile)
      ?.embeds?.map((l) => l.link.match(/[^#|]+/)[0]);

    const targets = [...(links ?? []), ...(embeds ?? [])];

    for (const target of targets) {
      const sourceOrder = getSourceOrder(altFile);
      const targetOrder = getTargetOrder(frontms, linkNoteBasename);
      populateMain(
        settings,
        mainG,
        linkNoteBasename,
        field,
        target,
        sourceOrder,
        targetOrder,
        true
      );
    }
  });
}
