import { PluginSettingTab, Setting } from "obsidian";
import { drawTrail } from "src/Views/TrailView";
import KoFi from "../Components/KoFi.svelte";
import type BCPlugin from "../main";
import { addCreateIndexSettings } from "./CreateIndexSettings";
import { addCSVSettings } from "./CSVSettings";
import { addDataviewSettings } from "./DataviewNoteSettings";
import { addDateNoteSettings } from "./DateNoteSettings";
import { addDebuggingsSettings } from "./DebuggingSettings";
import { addDendronSettings } from "./DendronSettings";
import { addGeneralSettings } from "./GeneralSettings";
import { addHierarchyNoteSettings } from "./HierarchyNoteSettings";
import { addHierarchySettings } from "./HierarchySettings";
import { addJumpToNextSettings } from "./JumpToNextSettings";
import { addMatrixViewSettings } from "./MatrixViewSettings";
import { addNoSystemSettings } from "./NoSystemSettings";
import { addRegexNoteSettings } from "./RegexNoteSettings";
import { addRelationSettings } from "./RelationSettings";
import { addTagNoteSettings } from "./TagNoteSettings";
import { addThreadingSettings } from "./ThreadingSettings";
import { addTrailViewSettings } from "./TrailSettings";
import { addVisModalSettings } from "./VisModalSettings";
import { addWriteBCsSettings } from "./WriteBCsSettings";

export const fragWithHTML = (html: string) =>
  createFragment((frag) => (frag.createDiv().innerHTML = html));

export const details = (text: string, parent: HTMLElement) =>
  parent.createEl("details", {}, (d) => d.createEl("summary", { text }));

export const subDetails = (text: string, parent: HTMLDetailsElement) =>
  parent.createDiv({
    attr: { style: "padding-left: 10px;" },
  })
    .createEl("details", {}, (d) => d.createEl("summary", { text }));

export class BCSettingTab extends PluginSettingTab {
  plugin: BCPlugin;

  constructor(plugin: BCPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  async display(): Promise<void> {
    const { plugin, containerEl } = this;
    const { settings } = plugin

    containerEl.empty();
    containerEl.createEl("h2", { text: "Breadcrumbs Settings" });
    containerEl.addClass("BC-settings-tab");

    addHierarchySettings(plugin, containerEl);
    addRelationSettings(plugin, containerEl);
    addGeneralSettings(plugin, containerEl);

    const viewDetails = details("Views", containerEl);

    new Setting(viewDetails)
      .setName("Open Views by Default")
      .setDesc(fragWithHTML("Choose which of the views to open onload<br/>Order is: Trail/Grid/Juggl, Matrix, Ducks, Tree"))
      .addToggle((toggle) =>
        toggle
          .setTooltip("Trail/Grid/Juggl")
          .setValue(settings.showBCs)
          .onChange(async (value) => {
            settings.showBCs = value;
            await plugin.saveSettings();
            await drawTrail(plugin);
          })
      )
      .addToggle((toggle) => {
        toggle
          .setTooltip("Matrix View")
          .setValue(settings.openMatrixOnLoad)
          .onChange(async (value) => {
            settings.openMatrixOnLoad = value;
            await plugin.saveSettings();
          });
      })
      .addToggle((toggle) => {
        toggle
          .setTooltip("Ducks View")
          .setValue(settings.openDuckOnLoad)
          .onChange(async (value) => {
            settings.openDuckOnLoad = value;
            await plugin.saveSettings();
          });
      })
      .addToggle((toggle) => {
        toggle
          .setTooltip("Tree View")
          .setValue(settings.openDownOnLoad)
          .onChange(async (value) => {
            settings.openDownOnLoad = value;
            await plugin.saveSettings();
          });
      });

    viewDetails.createEl('hr')

    addMatrixViewSettings(plugin, viewDetails);
    addTrailViewSettings(plugin, viewDetails);
    addVisModalSettings(plugin, viewDetails);
    // addTreeViewSettings(plugin, viewDetails);

    const alternativeHierarchyDetails = details(
      "Alternative Hierarchies",
      containerEl
    );

    addTagNoteSettings(plugin, alternativeHierarchyDetails);
    addRegexNoteSettings(plugin, alternativeHierarchyDetails);
    addNoSystemSettings(plugin, alternativeHierarchyDetails);
    addHierarchyNoteSettings(plugin, alternativeHierarchyDetails);
    addCSVSettings(plugin, alternativeHierarchyDetails);
    addDendronSettings(plugin, alternativeHierarchyDetails);
    addDataviewSettings(plugin, alternativeHierarchyDetails);
    addDateNoteSettings(plugin, alternativeHierarchyDetails);

    const cmdsDetails = details("Commands", containerEl);
    addWriteBCsSettings(plugin, cmdsDetails);
    addCreateIndexSettings(plugin, cmdsDetails);
    addThreadingSettings(plugin, cmdsDetails);
    addJumpToNextSettings(plugin, cmdsDetails);

    addDebuggingsSettings(plugin, containerEl);

    new KoFi({ target: containerEl });
  }
}
