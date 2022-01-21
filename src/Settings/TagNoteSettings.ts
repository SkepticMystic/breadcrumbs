import { DropdownComponent, Setting } from "obsidian";
import type BCPlugin from "../main";
import { refreshIndex } from "../refreshIndex";
import { getFields } from "../sharedFunctions";
import { fragWithHTML, subDetails } from "./BreadcrumbsSettingTab";

export function addTagNoteSettings(
  plugin: BCPlugin,
  alternativeHierarchyDetails: HTMLDetailsElement
) {
  const { settings } = plugin;
  const tagNoteDetails = subDetails("Tag Notes", alternativeHierarchyDetails);

  new Setting(tagNoteDetails)
    .setName("Default Tag Note Field")
    .setDesc(
      fragWithHTML(
        "By default, tag notes use the first field in your hierarchies (usually an <code>↑</code> field). Choose a different one to use by default, without having to specify <code>BC-tag-note-field: {field}</code>.</br>If you don't want to choose a default, select the blank option at the bottom of the list."
      )
    )
    .addDropdown((dd: DropdownComponent) => {
      const options = {};
      getFields(settings.userHiers).forEach(
        (field) => (options[field] = field)
      );
      dd.addOptions(Object.assign(options, { "": "" }));
      dd.onChange(async (field) => {
        settings.tagNoteField = field;
        await plugin.saveSettings();
        await refreshIndex(plugin);
      });
    });
}
