import { Notice, TFile } from "obsidian";
import type BCPlugin from "../main";
import { getOppFields } from "../Utils/HierUtils";
import { createOrUpdateYaml, splitAtYaml } from "../Utils/ObsidianUtils";

export async function writeBCToFile(plugin: BCPlugin, currFile?: TFile) {
  const { app, settings, mainG } = plugin;
  const file = currFile ?? app.workspace.getActiveFile();

  const { limitWriteBCCheckboxes, writeBCsInline, userHiers } = settings;

  const { frontmatter } = app.metadataCache.getFileCache(file);
  const api = app.plugins.plugins.metaedit?.api;

  if (!api) {
    new Notice("Metaedit must be enabled for this function to work");
    return;
  }

  const succInfo = mainG.mapInEdges(file.basename, (k, a, s, t) => {
    const { field, dir } = a;
    const oppField = getOppFields(userHiers, field, dir)[0];
    return { succ: s, field: oppField };
  });

  for (const { succ, field } of succInfo) {
    if (!limitWriteBCCheckboxes.includes(field)) return;

    if (!writeBCsInline) {
      await createOrUpdateYaml(field, succ, file, frontmatter, api);
    } else {
      // TODO Check if this note already has this field
      let content = await app.vault.read(file);
      const splits = splitAtYaml(content);
      content =
        splits[0] +
        (splits[0].length ? "\n" : "") +
        `${field}:: [[${succ}]]` +
        (splits[1].length ? "\n" : "") +
        splits[1];

      await app.vault.modify(file, content);
    }
  }
}

export async function writeBCsToAllFiles(plugin: BCPlugin) {
  if (!plugin.settings.showWriteAllBCsCmd) {
    new Notice(
      "You first need to enable this command in Breadcrumbs' settings."
    );
    return;
  }
  if (
    window.confirm(
      "This action will write the implied Breadcrumbs of each file to that file.\nIt uses the MetaEdit plugins API to update the YAML, so it should only affect that frontmatter of your note.\nI can't promise that nothing bad will happen. **This operation cannot be undone**."
    )
  ) {
    if (
      window.confirm(
        "Are you sure? You have been warned that this operation will attempt to update all files with implied breadcrumbs."
      )
    ) {
      if (window.confirm("For real, please make a back up before.")) {
        const notice = new Notice("Operation Started");
        const problemFiles = [];
        for (const file of plugin.app.vault.getMarkdownFiles()) {
          try {
            await writeBCToFile(plugin, file);
          } catch (e) {
            problemFiles.push(file.path);
          }
        }
        notice.setMessage("Operation Complete");
        if (problemFiles.length) {
          new Notice(
            "Some files were not updated due to errors. Check the console to see which ones."
          );
          console.log({ problemFiles });
        }
      }
    }
  }
}
