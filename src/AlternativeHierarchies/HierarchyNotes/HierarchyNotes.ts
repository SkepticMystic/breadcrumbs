import type { MultiGraph } from "graphology";
import type { TFile } from "obsidian";
import { getDVBasename, getSettings } from "../../Utils/ObsidianUtils";
import type { BCSettings, HierarchyNoteItem } from "../../interfaces";
import { addEdgeIfNot, addNodesIfNot } from "../../Utils/graphUtils";
import { getFieldInfo, getFields, getOppDir, getOppFields } from "../../Utils/HierUtils";

export async function getHierarchyNoteItems(file: TFile) {
  const { listItems } = app.metadataCache.getFileCache(file);
  if (!listItems) return [];

  const basename = getDVBasename(file);
  const { hierarchyNoteIsParent } = getSettings();

  const lines = (await app.vault.cachedRead(file)).split("\n");

  const hierarchyNoteItems: HierarchyNoteItem[] = [];

  const lineReg = new RegExp(/^\s*[+*-](?:\s+(?<field>.+?))?\s+\[\[(?<note>.+?)\]\]/);

  for (const item of listItems) {
    const line = lines[item.position.start.line];

    const results = lineReg.exec(line);
    if (!results) continue;
    const { field, note } = results.groups;

    const { parent } = item;
    if (parent >= 0) {
      const parentResults = lineReg.exec(lines[parent]);
      if (!parentResults) continue;
      const { note: parentNote } = parentResults.groups;

      hierarchyNoteItems.push({
        note,
        parent: parentNote,
        field,
      });
    } else {
      hierarchyNoteItems.push({
        note,
        parent: hierarchyNoteIsParent ? basename : null,
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
