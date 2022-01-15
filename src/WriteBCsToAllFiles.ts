import { Notice } from "obsidian";
import type BCPlugin from "./main";

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
            await plugin.writeBCToFile(file);
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
