import type { MultiGraph } from "graphology";
import type { ListItemCache, TFile } from "obsidian";
import { getDVBasename, getSettings } from "../../Utils/ObsidianUtils";
import type { BCSettings, HierarchyNoteItem } from "../../interfaces";
import { addEdgeIfNot, addNodesIfNot } from "../../Utils/graphUtils";
import { getFieldInfo, getFields, getOppDir, getOppFields } from "../../Utils/HierUtils";
import { BC_HIERARCHY_NOTE_NEXT, BC_HIERARCHY_NOTE_PREV } from "../../constants";

// match a line that contains a node in the hierarchy
const lineReg = new RegExp(/^\s*[+*-](?:\s+(?<field>.+?))?\s+\[\[(?<note>.+?)\]\]/);

export async function getHierarchyNoteItems(file: TFile) {
  const { listItems, frontmatter } = app.metadataCache.getFileCache(file);
  if (!listItems) return [];

  const nextField: string | undefined = frontmatter[BC_HIERARCHY_NOTE_NEXT];
  const prevField: string | undefined = frontmatter[BC_HIERARCHY_NOTE_PREV];

  const basename = getDVBasename(file);
  const { hierarchyNoteIsParent } = getSettings();

  const lines = (await app.vault.cachedRead(file)).split("\n");

  const hierarchyNoteItems: HierarchyNoteItem[] = [];

  // map from each parent to the last visited of its direct children
  let prevItemInGroup: Record<number, {
    item: ListItemCache;
    note: string;
  } | null> = {};

  for (const item of listItems) {
    // ensure this list item is a valid node in the hierarchy
    const line = lines[item.position.start.line];
    const results = lineReg.exec(line);
    if (!results) continue;
    const { field, note } = results.groups;

    // add its parent using the provided field
    // if no parent is found then add it to the root file if that setting is enabled
    const { parent } = item;
    if (parent >= 0) {
      const matches = lineReg.exec(lines[parent]);
      if (!matches) continue;
      const { note: parentNote } = matches.groups;

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

    // add the neighbours in the list
    const prevItem = prevItemInGroup[item.parent];
    if (prevItem) {
      if (nextField) {
        hierarchyNoteItems.push({
          note: prevItem.note,
          parent: note,
          field: nextField,
        });
      }
      if (prevField) {
        hierarchyNoteItems.push({
          note,
          parent: prevItem.note,
          field: prevField,
        });
      }
    }

    prevItemInGroup[item.parent] = {
      item,
      note,
    };
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
