import { Notice, Setting } from "obsidian";
import type BCPlugin from "../main";
import { refreshIndex } from "../refreshIndex";
import { getFields, strToRegex } from "../sharedFunctions";
import { fragWithHTML, subDetails } from "./BreadcrumbsSettingTab";

export function addNoSystemSettings(
  plugin: BCPlugin,
  alternativeHierarchyDetails: HTMLDetailsElement
) {
  const { settings } = plugin;
  const { userHiers } = settings;
  const fields = getFields(userHiers);

  const noSystemDetails = subDetails(
    "Naming System",
    alternativeHierarchyDetails
  );

  new Setting(noSystemDetails)
    .setName("Naming System Regex")
    .setDesc(
      fragWithHTML(
        "If you name your notes using the Johnny Decimal System or a related system, enter a regular expression matching the longest possible naming system you use. The regex should only match the naming system part of the name, not the actual note title.</br> For example, if you use the Johnny Decimal System, you might use <code>/^\\d\\.\\d\\.\\w/g</code> to match the note named <code>1.2.a Cars</code>.</br>If you don't want to choose a default, select the blank option at the bottom of the list."
      )
    )
    .addText((text) => {
      text.setValue(settings.namingSystemRegex);
      text.inputEl.onblur = async () => {
        const value = text.getValue();
        if (value === "" || strToRegex(value)) {
          settings.namingSystemRegex = value;
          await plugin.saveSettings();
          await refreshIndex(plugin);
        } else {
          new Notice("Invalid Regex");
        }
      };
    });
  new Setting(noSystemDetails)
    .setName("Naming System Delimiter")
    .setDesc(
      fragWithHTML(
        "What character do you use to split up your naming convention? For example, if you use <code>1.2.a.b</code>, then your delimiter is a period (<code>.</code>)."
      )
    )
    .addText((text) => {
      text.setValue(settings.namingSystemSplit);
      text.inputEl.onblur = async () => {
        const value = text.getValue();
        settings.namingSystemSplit = value;
        await plugin.saveSettings();
        await refreshIndex(plugin);
      };
    });

  new Setting(noSystemDetails)
    .setName("Naming System Field")
    .setDesc("Which field should Breadcrumbs use for Naming System notes?")
    .addDropdown((dd) => {
      fields.forEach((field) => {
        dd.addOption(field, field);
      });
      dd.setValue(settings.namingSystemField);
      dd.onChange(async (value) => {
        settings.namingSystemField = value;
        await plugin.saveSettings();
        await refreshIndex(plugin);
      });
    });
  new Setting(noSystemDetails)
    .setName("Naming System Ends with Delimiter")
    .setDesc(
      fragWithHTML(
        "Does your naming convention end with the delimiter? For example, <code>1.2. Note</code> does end with the delimiter, but <code>1.2 Note</code> does not.</br>For matching purposes, it is highly recommended to name your notes with the delimiter on the end. Only turn this setting on if you do name your notes this way, but know that the results may not be as accurate if you don't."
      )
    )
    .addToggle((tog) =>
      tog
        .setValue(settings.namingSystemEndsWithDelimiter)
        .onChange(async (value) => {
          settings.namingSystemEndsWithDelimiter = value;
          await plugin.saveSettings();
          await refreshIndex(plugin);
        })
    );
}
