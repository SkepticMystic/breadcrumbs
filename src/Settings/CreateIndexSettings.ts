import { Setting } from "obsidian";
import type BCPlugin from "../main";
import { fragWithHTML, subDetails } from "./BreadcrumbsSettingTab";

export function addCreateIndexSettings(
  plugin: BCPlugin,
  cmdsDetails: HTMLDetailsElement
) {
  const { settings } = plugin;
  const createIndexDetails = subDetails("Create Index", cmdsDetails);

  new Setting(createIndexDetails)
    .setName("Add wiklink brackets")
    .setDesc(
      fragWithHTML(
        "When creating an index, should it wrap the note name in wikilinks <code>[[]]</code> or not.\n✅ = yes, ❌ = no."
      )
    )
    .addToggle((toggle) =>
      toggle.setValue(settings.wikilinkIndex).onChange(async (value) => {
        settings.wikilinkIndex = value;
        await plugin.saveSettings();
      })
    );

  new Setting(createIndexDetails)
    .setName("Show aliases of notes in index")
    .setDesc("Show the aliases of each note in brackets.\n✅ = yes, ❌ = no.")
    .addToggle((toggle) =>
      toggle.setValue(settings.aliasesInIndex).onChange(async (value) => {
        settings.aliasesInIndex = value;
        await plugin.saveSettings();
      })
    );
}
