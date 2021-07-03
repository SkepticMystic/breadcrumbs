import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type BreadcrumbsPlugin from "src/main";
import { isInVault, splitAndTrim } from "src/sharedFunctions";

export class BreadcrumbsSettingTab extends PluginSettingTab {
  plugin: BreadcrumbsPlugin;

  constructor(app: App, plugin: BreadcrumbsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const plugin = this.plugin;
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
          .setValue(plugin.settings.parentFieldName)
          .onChange(async (value) => {
            plugin.settings.parentFieldName = value;
            await plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Sibling Metadata Field")
      .setDesc("The key name you use as the sibling field.")
      .addText((text) =>
        text
          .setPlaceholder("Field name")
          .setValue(plugin.settings.siblingFieldName)
          .onChange(async (value) => {
            plugin.settings.siblingFieldName = value;
            await plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Child Metadata Field")
      .setDesc("The key name you use as the child field.")
      .addText((text) =>
        text
          .setPlaceholder("Field name")
          .setValue(plugin.settings.childFieldName)
          .onChange(async (value) => {
            plugin.settings.childFieldName = value;
            await plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Refresh Interval")
      .setDesc(
        "Enter an integer number of seconds to wait before Breadcrumbs auto-refreshes its data. This would update the matrix view and the trail if either are affected. (Set to 0 to disable autorefreshing)"
      )
      .addText((text) =>
        text
          .setPlaceholder("Seconds")
          .setValue(plugin.settings.refreshIntervalTime.toString())
          .onChange(async (value) => {
            clearInterval(plugin.refreshIntervalID);
            const num = Number(value);

            if (num > 0) {
              plugin.settings.refreshIntervalTime = num;
              await plugin.saveSettings();

              plugin.refreshIntervalID = window.setInterval(async () => {
                if (plugin.trailDiv || plugin.matrixView) {
                  plugin.currGraphs = await plugin.initGraphs();
                }
                if (plugin.trailDiv) {
                  await plugin.drawTrail();
                }
                if (plugin.matrixView) {
                  await plugin.matrixView.draw();
                }
              }, num * 1000);
              plugin.registerInterval(plugin.refreshIntervalID);
            } else if (num === 0) {
              plugin.settings.refreshIntervalTime = num;
              await plugin.saveSettings();
              clearInterval(plugin.refreshIntervalID);
            } else {
              new Notice("The interval must be a non-negative number");
            }
          })
      );

    containerEl.createEl("h3", { text: "Matrix/List View" });

    new Setting(containerEl)
      .setName("Show Matrix or List view by default")
      .setDesc(
        "When Obsidian first loads, which view should it show? On = Matrix, Off = List"
      )
      .addToggle((toggle) =>
        toggle.setValue(plugin.settings.defaultView).onChange(async (value) => {
          plugin.settings.defaultView = value;
          await plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Show all field names or just relation types")
      .setDesc(
        "This changes the headers in matrix/list view. You can have the headers be the list of metadata fields for each relation type (e.g. `parent, broader, upper`). Or you can have them just be the name of the relation type, i.e. 'Parent', 'Sibling', 'Child'. On = show the full list of names."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(plugin.settings.showNameOrType)
          .onChange(async (value) => {
            plugin.settings.showNameOrType = value;
            await plugin.saveSettings();
            await plugin.matrixView.draw();
          })
      );

    new Setting(containerEl)
      .setName("Show Relationship Type")
      .setDesc(
        "Show whether a link is real or implied. A real link is one you explicitly put in a note. E.g. parent:: [[Note]]. An implied link is the reverse of a real link. For example, if A is the real parent of B, then B must be the implied child of A."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(plugin.settings.showRelationType)
          .onChange(async (value) => {
            plugin.settings.showRelationType = value;
            await plugin.saveSettings();
            await plugin.matrixView.draw();
          })
      );

    containerEl.createEl("h3", { text: "Breadcrumb Trail" });

    new Setting(containerEl)
      .setName("Show Breadcrumb Trail")
      .setDesc(
        "Show a trail of notes leading from your index note down to the current note you are in (if a path exists)"
      )
      .addToggle((toggle) =>
        toggle.setValue(plugin.settings.showTrail).onChange(async (value) => {
          plugin.settings.showTrail = value;

          await plugin.saveSettings();
          if (value) {
            plugin.trailDiv = createDiv({
              cls: `breadcrumbs-trail is-readable-line-width${plugin.settings.respectReadableLineLength
                ? " markdown-preview-sizer markdown-preview-section"
                : ""
                }`,
            });
            await plugin.drawTrail();
          } else {
            plugin.trailDiv.remove();
          }
        })
      );

    new Setting(containerEl)
      .setName("Index/Home Note(s)")
      .setDesc(
        "The note that all of your other notes lead back to. The parent of all your parent notes. Just enter the name. So if your index note is `000 Home.md`, enter `000 Home`. You can also have multiple index notes (comma-separated list). The breadcrumb trail will show the shortest path back to any one of the index notes listed"
      )
      .addText((text) => {
        let finalValue: string[];
        text
          .setPlaceholder("Index Note")
          .setValue([plugin.settings.indexNote].flat().join(", "))
          .onChange(async (value) => {
            finalValue = splitAndTrim(value);
          });

        text.inputEl.onblur = async () => {
          // TODO Refactor this to general purpose isInVault function

          if (finalValue === [""]) {
            plugin.settings.indexNote = finalValue;
            await plugin.saveSettings()
          } else if (finalValue.every(index => isInVault(this.app, index))) {
            plugin.settings.indexNote = finalValue;
            await plugin.saveSettings();
          } else {
            new Notice(`Atleast one of the notes is not in your vault`);
          }
          console.log(finalValue);
        };
      });

    new Setting(containerEl)
      .setName("Breadcrumb trail seperator")
      .setDesc(
        "The character to show between crumbs in the breadcrumb trail. The default is '→'"
      )
      .addText((text) =>
        text
          .setPlaceholder("→")
          .setValue(plugin.settings.trailSeperator)
          .onChange(async (value) => {
            plugin.settings.trailSeperator = value;
            await plugin.saveSettings();
            // BUG This doesn't seem to work... you still have to switch notes for it to redraw
            await plugin.matrixView.draw();
          })
      );

    new Setting(containerEl)
      .setName("No path found message")
      .setDesc("The text to display when no path to the index note was found")
      .addText((text) =>
        text
          .setPlaceholder(`No path to index note was found`)
          .setValue(plugin.settings.noPathMessage)
          .onChange(async (value) => {
            plugin.settings.noPathMessage = value;
            await plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Respect Readable Line Length")
      .setDesc(
        "Should the breadcrumbs trail adjust its width to the readable line length, or use as much space as possible? On = use readable line length."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(plugin.settings.respectReadableLineLength)
          .onChange(async (value) => {
            plugin.settings.respectReadableLineLength = value;
            await plugin.saveSettings();
          })
      );

    containerEl.createEl("h3", { text: "Debugging Options" });

    new Setting(containerEl)
      .setName("Debug Mode")
      .setDesc(
        "Toggling this on will enable a few console logs to appear when use the matrix/list view, or the trail."
      )
      .addToggle((toggle) =>
        toggle.setValue(plugin.settings.debugMode).onChange(async (value) => {
          plugin.settings.debugMode = value;
          await plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Super Debug Mode")
      .setDesc("Toggling this on will enable ALOT of console logs")
      .addToggle((toggle) =>
        toggle
          .setValue(plugin.settings.superDebugMode)
          .onChange(async (value) => {
            plugin.settings.superDebugMode = value;
            await plugin.saveSettings();
          })
      );
  }
}
