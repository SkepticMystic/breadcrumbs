import { Setting } from "obsidian";
import type BCPlugin from "../main";
import { subDetails } from "./BreadcrumbsSettingTab";

export function addTreeViewSettings(
  plugin: BCPlugin,
  viewDetails: HTMLDetailsElement
) {
  const { settings } = plugin;
  const treeViewDetails = subDetails("Tree View", viewDetails);

  new Setting(treeViewDetails)
    .setName("Enable line wrapping")
    .setDesc(
      "Make the items in the tree view line wrap when there isn't enough space (✅). ❌ makes them overflow off the screen."
    )
    .addToggle((toggle) =>
      toggle.setValue(settings.downViewWrap).onChange(async (value) => {
        settings.downViewWrap = value;
        await plugin.saveSettings();
      })
    );
}
