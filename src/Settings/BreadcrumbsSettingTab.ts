import { App, PluginSettingTab, Setting } from "obsidian";
import { addDataviewSettings } from "./DataviewNoteSettings";
import KoFi from "../Components/KoFi.svelte";
import type BCPlugin from "../main";
import { addCreateIndexSettings } from "./CreateIndexSettings";
import { addCSVSettings } from "./CSVSettings";
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
import { addTreeViewSettings } from "./TreeViewSettings";
import { addVisModalSettings } from "./VisModalSettings";
import { addWriteBCsSettings } from "./WriteBCsSettings";
import { addDateNoteSettings } from "./DateNoteSettings";

export const fragWithHTML = (html: string) =>
  createFragment((frag) => (frag.createDiv().innerHTML = html));

export const details = (text: string, parent) =>
  parent.createEl("details", {}, (d) => d.createEl("summary", { text }));

export const subDetails = (text: string, parent: HTMLDetailsElement) =>
  parent
    .createDiv({
      attr: { style: "padding-left: 10px;" },
    })
    .createEl("details", {}, (d) => d.createEl("summary", { text }));

export class BCSettingTab extends PluginSettingTab {
  plugin: BCPlugin;
  app: App;

  constructor(app: App, plugin: BCPlugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.app = app;
  }

  async display(): Promise<void> {
    const { plugin, containerEl } = this;
    const { settings } = plugin;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Breadcrumbs Settings" });
    containerEl.addClass("BC-settings-tab");

    addHierarchySettings(plugin, containerEl);
    addRelationSettings(plugin, containerEl);
    addGeneralSettings(plugin, containerEl);

    const viewDetails = details("Views", containerEl);
    addMatrixViewSettings(plugin, viewDetails);
    addTrailViewSettings(plugin, viewDetails);
    addVisModalSettings(plugin, viewDetails);
    addTreeViewSettings(plugin, viewDetails);

    const alternativeHierarchyDetails = details(
      "Alternative Hierarchies",
      containerEl
    );

    new Setting(alternativeHierarchyDetails)
      .setName("Enable Field Suggestor")
      .setDesc(
        fragWithHTML(
          'Alot of Breadcrumbs features require a metadata (or inline Dataview) field to work. For example, `BC-folder-note`.</br>The Field Suggestor will show an autocomplete menu with all available Breadcrumbs field options when the content you type matches the regex <code>/^BC-.*$/</code>. Basically, just type "BC-" at the start of a line to trigger it.'
        )
      )
      .addToggle((toggle) =>
        toggle.setValue(settings.fieldSuggestor).onChange(async (value) => {
          settings.fieldSuggestor = value;
          await plugin.saveSettings();
        })
      );
    new Setting(alternativeHierarchyDetails)
      .setName("Enable Relation Suggestor")
      .setDesc(
        fragWithHTML(
          "Enable an editor suggestor which gets triggered by a custom string to show a list of relations from your hierarchies to insert."
        )
      )
      .addToggle((toggle) =>
        toggle
          .setValue(settings.enableRelationSuggestor)
          .onChange(async (value) => {
            settings.enableRelationSuggestor = value;
            await plugin.saveSettings();
          })
      );
    new Setting(alternativeHierarchyDetails)
      .setName("Relation Suggestor Trigger")
      .setDesc(
        fragWithHTML(
          "The string used to trigger the relation suggestor. Default is <code>\\</code>."
        )
      )
      .addText((text) =>
        text.setValue(settings.relSuggestorTrigger).onChange(async (value) => {
          settings.relSuggestorTrigger = value;
          await plugin.saveSettings();
        })
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
