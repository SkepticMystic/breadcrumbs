import type { MultiGraph } from "graphology";
import type { TFile } from "obsidian";
import type { BCSettings, HierarchyNoteItem } from "../../interfaces";
import type BCPlugin from "../../main";
import { addEdgeIfNot, addNodesIfNot } from "../../Utils/graphUtils";
import { getFieldInfo, getFields, getOppDir, getOppFields } from "../../Utils/HierUtils";

export async function getHierarchyNoteItems(plugin: BCPlugin, file: TFile) {
  const { listItems } = app.metadataCache.getFileCache(file);
  if (!listItems) return [];

  const lines = (await app.vault.cachedRead(file)).split("\n");

  const hierarchyNoteItems: HierarchyNoteItem[] = [];

  const afterBulletReg = new RegExp(/\s*[+*-]\s(.*$)/);
  const dropWikiLinksReg = new RegExp(/\[\[(.*?)\]\]/);
  const fieldReg = new RegExp(/(.*?)\[\[.*?\]\]/);

  for (const item of listItems) {
    const line = lines[item.position.start.line];

    const afterBulletCurr = afterBulletReg.exec(line)[1];
    const note = dropWikiLinksReg.exec(afterBulletCurr)[1];
    let field = fieldReg.exec(afterBulletCurr)[1].trim() || null;

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
  return hierarchyNoteItems;
}

export function addHNsToGraph(
  settings: BCSettings,
  hnArr: HierarchyNoteItem[],
  mainG: MultiGraph
) {
  const { HNUpField, userHiers } = settings;
  const upFields = getFields(userHiers, "up");

  hnArr.forEach((hnItem, i) => {
    const { note, field, parent } = hnItem;

    const targetField = field ?? (HNUpField || upFields[0]);
    const dir = getFieldInfo(userHiers, targetField)?.fieldDir;
    const oppDir = getOppDir(dir);
    const oppField = getOppFields(userHiers, targetField, dir)[0];

    if (parent === null) {
      const s = note;
      const t = hnArr[i + 1]?.note;

      addNodesIfNot(mainG, [s, t]);
      addEdgeIfNot(mainG, s, t, { dir: oppDir, field: oppField });
    } else {
      addNodesIfNot(mainG, [note, parent]);
      if (settings.showUpInJuggl) {
        addEdgeIfNot(mainG, note, parent, {
          dir,
          field: targetField,
        });
      }
      
      addEdgeIfNot(mainG, parent, note, {
        dir: oppDir,
        field: oppField,
      });
    }
  });
}
