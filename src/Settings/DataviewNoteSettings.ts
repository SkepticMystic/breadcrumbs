import { DropdownComponent, Setting } from "obsidian";
import type BCPlugin from "../main";
import { refreshIndex } from "../refreshIndex";
import { getFields } from "../Utils/HierUtils";
import { fragWithHTML, subDetails } from "./BreadcrumbsSettingTab";

export function addDataviewSettings(
  plugin: BCPlugin,
  alternativeHierarchyDetails: HTMLDetailsElement
) {
  const { settings } = plugin;
  const { userHiers } = settings;
  const fields = getFields(userHiers);
  const dvDetails = subDetails("Dataview Notes", alternativeHierarchyDetails);

  new Setting(dvDetails)
    .setName("Default Dataview Note Field")
    .setDesc(
      fragWithHTML(
        "By default, Dataview notes use the first field in your hierarchies (usually an <code>↑</code> field). Choose a different one to use by default, without having to specify <code>BC-dataview-note-field: {field}</code>.</br>If you don't want to choose a default, select the blank option at the bottom of the list."
      )
    )
    .addDropdown((dd: DropdownComponent) => {
      fields.forEach((field) => dd.addOption(field, field));
      dd.addOption("", "")
        .setValue(settings.dataviewNoteField)
        .onChange(async (field) => {
          settings.dataviewNoteField = field;
          await plugin.saveSettings();
          await refreshIndex(plugin);
        });
    });
}
