import { DropdownComponent, Setting } from "obsidian";
import type BCPlugin from "../main";
import { refreshIndex } from "../refreshIndex";
import { getFields } from "../Utils/HierUtils";
import { fragWithHTML, subDetails } from "./BreadcrumbsSettingTab";

export function addRegexNoteSettings(
  plugin: BCPlugin,
  alternativeHierarchyDetails: HTMLDetailsElement
) {
  const { settings } = plugin;
  const regexNoteDetails = subDetails(
    "Regex Notes",
    alternativeHierarchyDetails
  );

  new Setting(regexNoteDetails)
    .setName("Default Regex Note Field")
    .setDesc(
      fragWithHTML(
        "By default, regex notes use the first field in your hierarchies (usually an <code>↑</code> field). Choose a different one to use by default, without having to specify <code>BC-regex-note-field: {field}</code>.</br>If you don't want to choose a default, select the blank option at the bottom of the list."
      )
    )
    .addDropdown((dd: DropdownComponent) => {
      const options = {};
      getFields(settings.userHiers).forEach(
        (field) => (options[field] = field)
      );
      dd.addOptions(Object.assign(options, { "": "" }))
        .setValue(settings.regexNoteField)
        .onChange(async (field) => {
          settings.regexNoteField = field;
          await plugin.saveSettings();
          await refreshIndex(plugin);
        });
    });
}
