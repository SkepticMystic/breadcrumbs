import { normalizePath, Notice } from "obsidian";
import type BCPlugin from "../main";
import { getFieldInfo, getOppFields } from "../Utils/HierUtils";
import { createOrUpdateYaml, splitAtYaml } from "../Utils/ObsidianUtils";

export async function thread(plugin: BCPlugin, field: string) {
  const { app, settings } = plugin;
  const {
    userHiers,
    writeBCsInline,
    threadingTemplate,
    dateFormat,
    threadingDirTemplates,
    threadIntoNewPane,
  } = settings;

  const currFile = app.workspace.getActiveFile();
  if (!currFile) return;

  const newFileParent = app.fileManager.getNewFileParent(currFile.path);

  const dir = getFieldInfo(userHiers, field).fieldDir;
  const oppField = getOppFields(userHiers, field, dir)[0];

  let newBasename = threadingTemplate
    ? threadingTemplate
        .replace("{{current}}", currFile.basename)
        .replace("{{field}}", field)
        .replace("{{dir}}", dir)
        //@ts-ignore
        .replace("{{date}}", moment().format(dateFormat))
    : "Untitled";

  let i = 1;
  while (app.metadataCache.getFirstLinkpathDest(newBasename, "")) {
    if (i === 1) newBasename += ` ${i}`;
    else newBasename = newBasename.slice(0, -2) + ` ${i}`;
    i++;
  }

  const crumb = writeBCsInline
    ? `${oppField}:: [[${currFile.basename}]]`
    : `---\n${oppField}: ['${currFile.basename}']\n---`;

  const templatePath = threadingDirTemplates[dir];
  let newContent = crumb;
  if (templatePath) {
    const templateFile = app.metadataCache.getFirstLinkpathDest(
      templatePath,
      ""
    );

    const template = await app.vault.cachedRead(templateFile);
    newContent = template.replace(
      /\{\{BC-thread-crumb\}\}/i,
      writeBCsInline
        ? `${oppField}:: [[${currFile.basename}]]`
        : `${oppField}: ['${currFile.basename}']`
    );
  }

  const newFile = await app.vault.create(
    normalizePath(`${newFileParent.path}/${newBasename}.md`),
    newContent
  );

  if (!writeBCsInline) {
    const { api } = app.plugins.plugins.metaedit ?? {};
    if (!api) {
      new Notice(
        "Metaedit must be enabled to write to yaml. Alternatively, toggle the setting `Write Breadcrumbs Inline` to use Dataview inline fields instead."
      );
      return;
    }
    await createOrUpdateYaml(
      field,
      newFile.basename,
      currFile,
      app.metadataCache.getFileCache(currFile).frontmatter,
      api
    );
  } else {
    // TODO Check if this note already has this field
    let content = await app.vault.read(currFile);
    const splits = splitAtYaml(content);
    content =
      splits[0] +
      (splits[0].length ? "\n" : "") +
      `${field}:: [[${newFile.basename}]]` +
      (splits[1].length ? "\n" : "") +
      splits[1];

    await app.vault.modify(currFile, content);
  }

  const leaf = threadIntoNewPane
    ? app.workspace.splitActiveLeaf()
    : app.workspace.activeLeaf;

  await leaf.openFile(newFile, { active: true, mode: "source" });

  if (templatePath) {
    if (app.plugins.plugins["templater-obsidian"]) {
      app.commands.executeCommandById(
        "templater-obsidian:replace-in-file-templater"
      );
    } else {
      new Notice(
        "The Templater plugin must be enabled to resolve the templates in the new note"
      );
    }
  }

  if (threadingTemplate) {
    // @ts-ignore
    const editor = leaf.view.editor as Editor;
    editor.setCursor(editor.getValue().length);
  } else {
    const noteNameInputs = document.getElementsByClassName("view-header-title");

    const newNoteInputEl = Array.from(noteNameInputs).find(
      (input: HTMLInputElement) => input.innerText === newBasename
    ) as HTMLInputElement;
    newNoteInputEl.innerText = "";
    newNoteInputEl.focus();
  }
}
