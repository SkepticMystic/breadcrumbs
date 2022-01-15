import { Notice, TFile } from "obsidian";
import { getFields } from "../sharedFunctions";
import type { HierarchyNoteItem } from "../interfaces";
import type BCPlugin from "../main";

export async function getHierarchyNoteItems(plugin: BCPlugin, file: TFile) {
  const { userHiers } = plugin.settings;
  const { listItems } = plugin.app.metadataCache.getFileCache(file);
  if (!listItems) return [];

  const lines = (await plugin.app.vault.cachedRead(file)).split("\n");

  const hierarchyNoteItems: HierarchyNoteItem[] = [];

  const afterBulletReg = new RegExp(/\s*[+*-]\s(.*$)/);
  const dropWikiLinksReg = new RegExp(/\[\[(.*?)\]\]/);
  const fieldReg = new RegExp(/(.*?)\[\[.*?\]\]/);

  const problemFields: string[] = [];

  const upFields = getFields(userHiers, "up");
  for (const item of listItems) {
    const currItem = lines[item.position.start.line];

    const afterBulletCurr = afterBulletReg.exec(currItem)[1];
    const note = dropWikiLinksReg.exec(afterBulletCurr)[1];
    let field = fieldReg.exec(afterBulletCurr)[1].trim() || null;

    // Ensure fieldName is one of the existing up fields. `null` if not
    if (field !== null && !upFields.includes(field)) {
      problemFields.push(field);
      field = null;
    }

    const { parent } = item;
    if (parent >= 0) {
      const parentNote = lines[parent];
      const afterBulletParent = afterBulletReg.exec(parentNote)[1];
      const dropWikiParent = dropWikiLinksReg.exec(afterBulletParent)[1];

      hierarchyNoteItems.push({
        note,
        parent: dropWikiParent,
        field,
      });
    } else {
      hierarchyNoteItems.push({
        note,
        parent: null,
        field,
      });
    }
  }
  if (problemFields.length > 0) {
    const msg = `'${problemFields.join(
      ", "
    )}' is/are not a field in any of your hierarchies, but is/are being used in: '${
      file.basename
    }'`;
    new Notice(msg);
    console.log(msg, { problemFields });
  }
  return hierarchyNoteItems;
}
