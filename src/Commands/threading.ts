import { App, normalizePath, Notice, TFile } from "obsidian";
import type { Directions } from "../interfaces";
import type BCPlugin from "../main";
import { getFieldInfo, getOppFields } from "../Utils/HierUtils";
import {createOrUpdateYaml, getCurrFile, splitAtYaml} from "../Utils/ObsidianUtils";

const resolveThreadingNameTemplate = (
  template: string,
  currFile: TFile,
  field: string,
  dir: Directions,
  dateFormat: string
) =>
  template
    ? template
        .replace("{{current}}", currFile.basename)
        .replace("{{field}}", field)
        .replace("{{dir}}", dir)
        //@ts-ignore
        .replace("{{date}}", moment().format(dateFormat))
    : "Untitled";

function makeFilenameUnique(app: App, filename: string) {
  let i = 1,
    newName = filename;
  while (app.metadataCache.getFirstLinkpathDest(newName, "")) {
    if (i === 1) newName += ` ${i}`;
    else newName = newName.slice(0, -2) + ` ${i}`;
    i++;
  }
  return newName;
}

async function resolveThreadingContentTemplate(
  app: App,
  writeBCsInline: boolean,
  templatePath: string,
  oppField: string,
  currFile: TFile,
  crumb: string
) {
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
  return newContent;
}

export async function thread(plugin: BCPlugin, field: string) {
  const { app, settings } = plugin;
  const {
    userHiers,
    threadingTemplate,
    dateFormat,
    threadIntoNewPane,
    threadingDirTemplates,
    threadUnderCursor,
    writeBCsInline,
  } = settings;

  const currFile = getCurrFile();
  if (!currFile) return;

  const newFileParent = app.fileManager.getNewFileParent(currFile.path);

  const dir = getFieldInfo(userHiers, field).fieldDir;
  const oppField = getOppFields(userHiers, field, dir)[0];

  let newBasename = resolveThreadingNameTemplate(
    threadingTemplate,
    currFile,
    field,
    dir,
    dateFormat
  );
  newBasename = makeFilenameUnique(app, newBasename);

  const oppCrumb = writeBCsInline
    ? `${oppField}:: [[${currFile.basename}]]`
    : `---\n${oppField}: ['${currFile.basename}']\n---`;

  const templatePath = threadingDirTemplates[dir];
  const newContent = await resolveThreadingContentTemplate(
    app,
    writeBCsInline,
    templatePath,
    oppField,
    currFile,
    oppCrumb
  );

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
    const crumb = `${field}:: [[${newFile.basename}]]`;
    const { editor } = app.workspace.activeLeaf.view;
    if (threadUnderCursor || !editor) {
      editor.replaceRange(crumb, editor.getCursor());
    } else {
      // TODO Check if this note already has this field
      let content = await app.vault.read(currFile);
      const splits = splitAtYaml(content);
      content =
        splits[0] +
        (splits[0].length ? "\n" : "") +
        crumb +
        (splits[1].length ? "\n" : "") +
        splits[1];

      await app.vault.modify(currFile, content);
    }
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
