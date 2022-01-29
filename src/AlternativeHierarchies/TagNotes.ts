import type { MultiGraph } from "graphology";
import type { App, TFile } from "obsidian";
import {
  BC_TAG_NOTE,
  BC_TAG_NOTE_EXACT,
  BC_TAG_NOTE_FIELD,
} from "../constants";
import type { dvFrontmatterCache } from "../interfaces";
import type BCPlugin from "../main";
import { splitAndTrim } from "../Utils/generalUtils";
import {
  getSourceOrder,
  getTargetOrder,
  populateMain,
} from "../Utils/graphUtils";
import { getFields } from "../Utils/HierUtils";
import { dropHash, getDVBasename } from "../Utils/ObsidianUtils";

const getAllTags = (app: App, file: TFile, withHash = true): string[] => {
  const { tags, frontmatter } = app.metadataCache.getFileCache(file);
  const allTags: string[] = [];

  tags?.forEach((t) => allTags.push(dropHash(t.tag)));

  [frontmatter?.tags ?? []].flat().forEach((t: string) => {
    splitAndTrim(t).forEach((innerT) => allTags.push(dropHash(innerT)));
  });
  [frontmatter?.tag ?? []].flat().forEach((t: string) => {
    splitAndTrim(t).forEach((innerT) => allTags.push(dropHash(innerT)));
  });

  return allTags.map((t) => (withHash ? "#" : "") + t.toLowerCase());
};

export function addTagNotesToGraph(
  plugin: BCPlugin,
  eligableAlts: dvFrontmatterCache[],
  frontms: dvFrontmatterCache[],
  mainG: MultiGraph
) {
  const { settings, app } = plugin;
  const { userHiers, tagNoteField } = settings;
  const fields = getFields(userHiers);
  eligableAlts.forEach((altFile) => {
    const tagNoteFile = altFile.file;

    const tagNoteBasename = getDVBasename(tagNoteFile);
    const tag = (altFile[BC_TAG_NOTE] as string).trim().toLowerCase();
    if (!tag.startsWith("#")) return;

    const hasThisTag = (file: TFile) => {
      const allTags = getAllTags(app, file);
      return altFile[BC_TAG_NOTE_EXACT] !== undefined
        ? allTags.includes(tag)
        : allTags.some((t) => t.includes(tag));
    };

    const targets = frontms
      .map((ff) => ff.file)
      .filter((file) => file.path !== tagNoteFile.path && hasThisTag(file))
      .map(getDVBasename);

    let field =
      (altFile[BC_TAG_NOTE_FIELD] as string) ?? (tagNoteField || fields[0]);

    targets.forEach((target) => {
      const sourceOrder = getSourceOrder(altFile);
      const targetOrder = getTargetOrder(frontms, tagNoteBasename);
      populateMain(
        settings,
        mainG,
        tagNoteBasename,
        field,
        target,
        sourceOrder,
        targetOrder,
        true
      );
    });
  });
}
