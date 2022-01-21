import { Setting } from "obsidian";
import Checkboxes from "../Components/Checkboxes.svelte";
import type BCPlugin from "../main";
import { getFields } from "../sharedFunctions";
import { fragWithHTML, subDetails } from "./BreadcrumbsSettingTab";

export function addWriteBCsSettings(
  plugin: BCPlugin,
  cmdsDetails: HTMLDetailsElement
) {
  const { settings } = plugin;
  const writeBCsToFileDetails = subDetails(
    "Write Breadcrumbs to File",
    cmdsDetails
  );

  const limitWriteBCDiv = writeBCsToFileDetails.createDiv({
    cls: "limit-ML-fields",
  });
  limitWriteBCDiv.createEl("strong", {
    text: "Limit to only write certain fields to files",
  });

  new Checkboxes({
    target: writeBCsToFileDetails,
    props: {
      plugin,
      options: getFields(settings.userHiers),
      settingName: "limitWriteBCCheckboxes",
    },
  });

  new Setting(writeBCsToFileDetails)
    .setName("Write BCs to file Inline")
    .setDesc(
      "When writing BCs to file, should they be written inline (using Dataview syntax), or into the YAML of the note?"
    )
    .addToggle((toggle) =>
      toggle.setValue(settings.writeBCsInline).onChange(async (value) => {
        settings.writeBCsInline = value;
        await plugin.saveSettings();
      })
    );

  new Setting(writeBCsToFileDetails)
    .setName(
      fragWithHTML(
        "Show the <code>Write Breadcrumbs to ALL Files</code> command"
      )
    )
    .setDesc(
      "This command attempts to update ALL files with implied breadcrumbs pointing to them. So, it is not shown by default (even though it has 3 confirmation boxes to ensure you want to run it"
    )
    .addToggle((toggle) =>
      toggle.setValue(settings.showWriteAllBCsCmd).onChange(async (value) => {
        settings.showWriteAllBCsCmd = value;
        await plugin.saveSettings();
      })
    );
}
