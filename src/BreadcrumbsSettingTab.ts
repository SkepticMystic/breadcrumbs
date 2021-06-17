import { App, PluginSettingTab, Setting } from "obsidian";
import type BreadcrumbsPlugin from "src/main";

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
      .setDesc(
        'The key name you use as the parent field. For example, if you use "parent: [[Note]]", then the value of this setting should be "parent"'
      )
      .addText((text) =>
        text
          .setPlaceholder("Field name")
          .setValue(this.plugin.settings.parentFieldName)
          .onChange(async (value) => {
            this.plugin.settings.parentFieldName = value;
            await this.plugin.saveSettings();
            console.log(this.plugin.settings.parentFieldName);
          })
      );

    new Setting(containerEl)
      .setName("Index/Home Note")
      .setDesc(
        "The note that all of your other notes lead back to. The parent of all your parent notes. Just enter the name. So if your index note is `000 Home.md`, enter `000 Home`."
      )
      .addText((text) =>
        text
          .setPlaceholder("Index Note")
          .setValue(this.plugin.settings.indexNote)
          .onChange(async (value) => {
            this.plugin.settings.indexNote = value;
            await this.plugin.saveSettings();
            console.log(this.plugin.settings.indexNote);
          })
      );
  }
}
