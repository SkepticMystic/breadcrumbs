import { DropdownComponent, Setting } from "obsidian";
import { ALLUNLINKED, REAlCLOSED, RELATIONS, VISTYPES } from "../constants";
import type { Relations, VisType } from "../interfaces";
import type BCPlugin from "../main";
import { subDetails } from "./BreadcrumbsSettingTab";

export function addVisModalSettings(
  plugin: BCPlugin,
  viewDetails: HTMLDetailsElement
) {
  const { settings } = plugin;
  const visModalDetails = subDetails("Visualisation Modal", viewDetails);

  new Setting(visModalDetails)
    .setName("Default Visualisation Type")
    .setDesc("Which visualisation to show by default")
    .addDropdown((cb: DropdownComponent) => {
      VISTYPES.forEach((option: VisType) => {
        cb.addOption(option, option);
      });
      cb.setValue(settings.visGraph);

      cb.onChange(async (value: VisType) => {
        settings.visGraph = value;
        await plugin.saveSettings();
      });
    });
  new Setting(visModalDetails)
    .setName("Default Relation")
    .setDesc("Which relation type to show first when opening the modal")
    .addDropdown((dd) => {
      RELATIONS.forEach((option: Relations) => {
        dd.addOption(option, option);
      });
      dd.setValue(settings.visRelation);

      dd.onChange(async (value: Relations) => {
        settings.visRelation = value;
        await plugin.saveSettings();
      });
    });
  new Setting(visModalDetails)
    .setName("Default Real/Closed")
    .setDesc("Show the real or closed graph by default")
    .addDropdown((cb: DropdownComponent) => {
      REAlCLOSED.forEach((option: string) => {
        cb.addOption(option, option);
      });
      cb.setValue(settings.visClosed);

      cb.onChange(async (value: string) => {
        settings.visClosed = value;
        await plugin.saveSettings();
      });
    });
  new Setting(visModalDetails)
    .setName("Default Unlinked")
    .setDesc("Show all nodes or only those which have links by default")
    .addDropdown((cb: DropdownComponent) => {
      ALLUNLINKED.forEach((option: string) => {
        cb.addOption(option, option);
      });
      cb.setValue(settings.visAll);

      cb.onChange(async (value: string) => {
        settings.visAll = value;
        await plugin.saveSettings();
      });
    });
}
