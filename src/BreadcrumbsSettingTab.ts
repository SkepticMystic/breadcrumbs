import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type BreadcrumbsPlugin from "./main";

export class BreadcrumbsSettingTab extends PluginSettingTab {
  plugin: BreadcrumbsPlugin;

  constructor(app: App, plugin: BreadcrumbsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Settings for Breadcrumbs plugin." });

    containerEl.createEl("h3", { text: "Metadata Field Names" });
    containerEl.createEl("p", {
      text: "The field names you use to indicate parent, sibling, and child relationships. Just enter the unformatted field name. So if you use `**parent**:: [[Note]]`, just enter `parent`.",
    });
    containerEl.createEl("p", {
      text: "You can enter multiple field names in a comma seperated list. For example: `parent, broader, upper`",
    });

    new Setting(containerEl)
      .setName("Parent Metadata Field")
      .setDesc("The key name you use as the parent field.")
      .addText((text) =>
        text
          .setPlaceholder("Field name")
          .setValue(this.plugin.settings.parentFieldName)
          .onChange(async (value) => {
            this.plugin.settings.parentFieldName = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Sibling Metadata Field")
      .setDesc("The key name you use as the sibling field.")
      .addText((text) =>
        text
          .setPlaceholder("Field name")
          .setValue(this.plugin.settings.siblingFieldName)
          .onChange(async (value) => {
            this.plugin.settings.siblingFieldName = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Child Metadata Field")
      .setDesc("The key name you use as the child field.")
      .addText((text) =>
        text
          .setPlaceholder("Field name")
          .setValue(this.plugin.settings.childFieldName)
          .onChange(async (value) => {
            this.plugin.settings.childFieldName = value;
            await this.plugin.saveSettings();
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
            if (
              !this.app.metadataCache.getFirstLinkpathDest(
                value,
                this.app.workspace.getActiveFile().path
              )
            ) {
              setTimeout(
                () => new Notice(`${value} is not a note in your vault`),
                1000
              );
            } else {
              this.plugin.settings.indexNote = value;
              await this.plugin.saveSettings();
            }
          })
      );

    containerEl.createEl("h3", { text: "Matrix/List View" });

    new Setting(containerEl)
      .setName("Show Relationship Type")
      .setDesc(
        "Show whether a link is real or implied. A real link is one you explicitly put in a note. E.g. parent:: [[Note]]. An implied link is the reverse of a real link. For example, if A is the real parent of B, then B must be the implied child of A."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showRelationType)
          .onChange(async (value) => {
            this.plugin.settings.showRelationType = value;
            await this.plugin.saveSettings();
          })
      );

    containerEl.createEl("h3", { text: "Breadcrumb Trail" });

    new Setting(containerEl)
      .setName("Show Breadcrumb Trail")
      .setDesc(
        "Show a trail of notes leading from your index note down to the current note you are in (if a path exists)"
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showTrail)
          .onChange(async (value) => {
            this.plugin.settings.showTrail = value;

            await this.plugin.saveSettings();
            if (value) {
              this.plugin.trailDiv = createDiv({
                cls: `breadcrumbs-trail is-readable-line-width${
                  this.plugin.settings.respectReadableLineLength
                    ? " markdown-preview-sizer markdown-preview-section"
                    : ""
                }`,
              });
              await this.plugin.drawTrail();
            } else {
              this.plugin.trailDiv.remove();
            }
          })
      );

    new Setting(containerEl)
      .setName("Breadcrumb trail seperator")
      .setDesc(
        "The character to show between crumbs in the breadcrumb trail. The default is '→'"
      )
      .addText((text) =>
        text
          .setPlaceholder("→")
          .setValue(this.plugin.settings.trailSeperator)
          .onChange(async (value) => {
            this.plugin.settings.trailSeperator = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Respect Readable Line Length")
      .setDesc(
        "Should the breadcrumbs trail adjust it's width to the readable line length, or use as much space as possible? Default is to use readable line length."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.respectReadableLineLength)
          .onChange(async (value) => {
            this.plugin.settings.respectReadableLineLength = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
