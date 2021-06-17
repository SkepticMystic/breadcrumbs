import { App, PluginSettingTab, Setting } from "obsidian";
import type BreadcrumbsPlugin from "../main";

export class BreadcrumbsSettingTab extends PluginSettingTab {
  plugin: BreadcrumbsPlugin;

  constructor(app: App, plugin: BreadcrumbsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h2", { text: "Settings for my awesome plugin." });

    new Setting(containerEl)
      .setName("Parent Metadata Field")
      .setDesc("The key name you use as the parent field. For example, if you use \"parent: [[Note]]\", then the value of this setting should be \"parent\"")
      .addText((text) =>
        text
          .setPlaceholder("Field name")
          .setValue(this.plugin.settings.parentFieldName)
          .onChange(async (value) => {
            // console.log("Secret: " + value);
            this.plugin.settings.parentFieldName = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
