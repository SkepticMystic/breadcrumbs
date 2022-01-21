import log from "loglevel";
import { Setting } from "obsidian";
import type { DebugLevel } from "../interfaces";
import type BCPlugin from "../main";
import { details, fragWithHTML } from "./BreadcrumbsSettingTab";

export function addDebuggingsSettings(
  plugin: BCPlugin,
  containerEl: HTMLElement
) {
  const { settings } = plugin;
  const debugDetails = details("Debugging", containerEl);

  new Setting(debugDetails)
    .setName("Debug Mode")
    .setDesc(
      fragWithHTML(
        "Set the minimum level of debug messages to console log. If you choose <code>TRACE</code>, then everything will be logged. If you choose <code>ERROR</code>, then only the most necessary issues will be logged. <code>SILENT</code> will turn off all logs."
      )
    )
    .addDropdown((dd) => {
      Object.keys(log.levels).forEach((key) => dd.addOption(key, key));
      dd.setValue(settings.debugMode).onChange(async (value: DebugLevel) => {
        log.setLevel(value);
        settings.debugMode = value;
        await plugin.saveSettings();
      });
    });

  debugDetails.createEl("button", { text: "Console log settings" }, (el) => {
    el.addEventListener("click", () => console.log(settings));
  });
}
