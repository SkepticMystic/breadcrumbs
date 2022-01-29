import { DropdownComponent, Setting } from "obsidian";
import { refreshIndex } from "../refreshIndex";
import type BCPlugin from "../main";
import { getFields } from "../Utils/HierUtils";
import { fragWithHTML, subDetails } from "./BreadcrumbsSettingTab";

export function addDateNoteSettings(
  plugin: BCPlugin,
  alternativeHierarchyDetails: HTMLDetailsElement
) {
  const { settings } = plugin;
  const { userHiers } = settings;
  const fields = getFields(userHiers);
  const fieldOptions = { "": "" };
  fields.forEach((field) => (fieldOptions[field] = field));

  const dateNoteDetails = subDetails("Date Notes", alternativeHierarchyDetails);

  new Setting(dateNoteDetails)
    .setName("Add Date Notes to Graph")
    .setDesc(
      "Breadcrumbs will try to link each daily note to the next one using the date format you provide in the settings below."
    )
    .addToggle((toggle) => {
      toggle.setValue(settings.addDateNotes).onChange(async (value) => {
        settings.addDateNotes = value;
        await plugin.saveSettings();
        await refreshIndex(plugin);
      });
    });

  new Setting(dateNoteDetails)
    .setName("Daily Note Format")
    .setDesc(
      fragWithHTML(
        `The Luxon date format of your daily notes. <strong>Note</strong>: Luxon uses different formats to Moment, so your format for the Daily Notes plugin may not work here. Be sure to check out <a href="https://moment.github.io/luxon/#/formatting?id=table-of-tokens">the docs</a> to find the right format.<br>You can escape characters by wrapping them in single quotes (e.g. <code>yyyy-MM-dd 'Daily Note'</code>)`
      )
    )
    .addText((text) => {
      text.setValue(settings.dateNoteFormat);
      text.inputEl.onblur = async () => {
        settings.dateNoteFormat = text.getValue();
        await plugin.saveSettings();
        await refreshIndex(plugin);
      };
    });

  new Setting(dateNoteDetails)
    .setName("Date Note Field")
    .setDesc(
      fragWithHTML(
        "Select a field to point to tomorrow's note from the current note. The opposite field will be used to point to yesterday's note (if you have the setting enable)."
      )
    )
    .addDropdown((dd: DropdownComponent) => {
      dd.addOptions(fieldOptions)
        .setValue(settings.dateNoteField)
        .onChange(async (field) => {
          settings.dateNoteField = field;
          await plugin.saveSettings();
          await refreshIndex(plugin);
        });
    });

  // new Setting(dateNoteDetails)
  //   .setName("Point up to Month")
  //   .setDesc(
  //     fragWithHTML(
  //       "Select a field to point upwards to the corresponding month (This will still work if a note doesn't exist for that month).<br>Leave the dropdown blank to disable this feature."
  //     )
  //   )
  //   .addDropdown((dd: DropdownComponent) => {
  //     dd.addOptions(fieldOptions);
  //     dd.onChange(async (field) => {
  //       settings.dateNoteAddMonth = field;
  //       await plugin.saveSettings();
  //       await refreshIndex(plugin);
  //     });
  //   });
  // new Setting(dateNoteDetails)
  //   .setName("Point up to Year")
  //   .setDesc(
  //     fragWithHTML(
  //       "Select a field to point upwards to the corresponding year (This will still work if a note doesn't exist for that year).<br>Leave the dropdown blank to disable this feature."
  //     )
  //   )
  //   .addDropdown((dd: DropdownComponent) => {
  //     dd.addOptions(fieldOptions);
  //     dd.onChange(async (field) => {
  //       settings.dateNoteAddYear = field;
  //       await plugin.saveSettings();
  //       await refreshIndex(plugin);
  //     });
  //   });
}
