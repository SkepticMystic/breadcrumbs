import {
  App,
  DropdownComponent,
  Notice,
  PluginSettingTab,
  Setting,
} from "obsidian";
import { ALLUNLINKED, REAlCLOSED, RELATIONS, VISTYPES } from "src/constants";
import type { Relations, visTypes } from "src/interfaces";
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
    containerEl.createEl("h2", { text: "Settings for Breadcrumbs plugin" });

    const fieldDetails: HTMLDetailsElement = containerEl.createEl("details");
    fieldDetails.createEl("summary", { text: "Metadata Field Names" });

    fieldDetails.createEl("p", {
      text: "The field names you use to indicate parent, sibling, and child relationships. Just enter the unformatted field name. So if you use `**parent**:: [[Note]]`, just enter `parent`.",
    });
    fieldDetails.createEl("p", {
      text: "You can enter multiple field names in a comma seperated list. For example: `parent, broader, upper`",
    });

    new Setting(fieldDetails)
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

    new Setting(fieldDetails)
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

    new Setting(fieldDetails)
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

    const generalDetails: HTMLDetailsElement = containerEl.createEl("details");
    generalDetails.createEl("summary", { text: "General Options" });

    new Setting(generalDetails)
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
                plugin.currGraphs = await plugin.initGraphs();
                if (plugin.settings.showTrail) {
                  await plugin.drawTrail();
                }
                if (plugin.getActiveMatrixView()) {
                  await plugin.getActiveMatrixView().draw();
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

    const MLViewDetails: HTMLDetailsElement = containerEl.createEl("details");
    MLViewDetails.createEl("summary", { text: "Matrix/List View" });

    new Setting(MLViewDetails)
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

    new Setting(MLViewDetails)
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
            await plugin.getActiveMatrixView().draw();
          })
      );

    new Setting(MLViewDetails)
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
            await plugin.getActiveMatrixView().draw();
          })
      );

    const trailDetails: HTMLDetailsElement = containerEl.createEl("details");
    trailDetails.createEl("summary", { text: "Trail/Grid" });

    new Setting(trailDetails)
      .setName("Show Breadcrumbs")
      .setDesc(
        "Show a trail of notes leading from your index note down to the current note you are in (if a path exists)"
      )
      .addToggle((toggle) =>
        toggle.setValue(plugin.settings.showTrail).onChange(async (value) => {
          plugin.settings.showTrail = value;
          await plugin.saveSettings();
          await plugin.drawTrail();
        })
      );

    new Setting(trailDetails)
      .setName("Trail or Table or Both")
      .setDesc(
        "Wether to show the regular breadcrumb trails, the table view, neither, or both. 1 = Only Trail, 2 = Only Grid, 3 = Both"
      )
      .addText((text) => {
        text
          .setPlaceholder("Index Note")
          .setValue(plugin.settings.trailOrTable.toString())
          .onChange(async (value) => {
            const num = parseInt(value);
            if ([1, 2, 3].includes(num)) {
              plugin.settings.trailOrTable = num as 1 | 2 | 3;
              await plugin.saveSettings();
              await plugin.drawTrail();
            } else {
              new Notice("The value has to be 1, 2, or 3");
            }
          });
      });

    new Setting(trailDetails)
      .setName("Grid view dots")
      .setDesc(
        "If the grid view is visible, shows dots based on the file size of each cell."
      )
      .addToggle((toggle) =>
        toggle.setValue(plugin.settings.gridDots).onChange(async (value) => {
          plugin.settings.gridDots = value;
          await plugin.saveSettings();
          await plugin.drawTrail();
        })
      );

    const dotsColour = trailDetails.createDiv();
    dotsColour.createEl("h4", {
      text: "Dots colour",
    });
    const dotsColourPicker = dotsColour.createEl("input", {
      type: "color",
    });

    dotsColourPicker.value = plugin.settings.dotsColour;
    dotsColourPicker.addEventListener("change", async () => {
      plugin.settings.dotsColour = dotsColourPicker.value;
      await plugin.saveSettings();
    });

    new Setting(trailDetails)
      .setName("Grid view heatmap")
      .setDesc(
        "If the grid view is visible, change the background colour of squares based on the number of children leaving that note."
      )
      .addToggle((toggle) =>
        toggle.setValue(plugin.settings.gridHeatmap).onChange(async (value) => {
          plugin.settings.gridHeatmap = value;
          await plugin.saveSettings();
          await plugin.drawTrail();
        })
      );

    const heatmapColour = trailDetails.createDiv();
    heatmapColour.createEl("h4", {
      text: "Heat map colour",
    });
    const heatmapColourPicker = heatmapColour.createEl("input", {
      type: "color",
    });

    heatmapColourPicker.value = plugin.settings.heatmapColour;
    heatmapColourPicker.addEventListener("change", async () => {
      plugin.settings.heatmapColour = heatmapColourPicker.value;
      await plugin.saveSettings();
    });

    new Setting(trailDetails)
      .setName("Index/Home Note(s)")
      .setDesc(
        "The note that all of your other notes lead back to. The parent of all your parent notes. Just enter the name. So if your index note is `000 Home.md`, enter `000 Home`. You can also have multiple index notes (comma-separated list). The breadcrumb trail will show the shortest path back to any one of the index notes listed. You can now leave this field empty, meaning the trail will show a path going as far up the parent-tree as possible."
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
            await plugin.saveSettings();
          } else if (finalValue.every((index) => isInVault(this.app, index))) {
            plugin.settings.indexNote = finalValue;
            await plugin.saveSettings();
          } else {
            new Notice(`Atleast one of the notes is not in your vault`);
          }
        };
      });

    new Setting(trailDetails)
      .setName("Default: All or Shortest")
      .setDesc(
        "If multiple paths are found going up the parent tree, should all of them be shown by default, or only the shortest? On = all, off = shortest"
      )
      .addToggle((toggle) =>
        toggle.setValue(plugin.settings.showAll).onChange(async (value) => {
          plugin.settings.showAll = value;

          await plugin.saveSettings();
          await plugin.drawTrail();
        })
      );

    new Setting(trailDetails)
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
            await plugin.drawTrail();
          })
      );

    new Setting(trailDetails)
      .setName("No path found message")
      .setDesc(
        "The text to display when no path to the index note was found, or when the current note has no parent (this happens if you haven't chosen an index note)"
      )
      .addText((text) =>
        text
          .setPlaceholder(`No path to index note was found`)
          .setValue(plugin.settings.noPathMessage)
          .onChange(async (value) => {
            plugin.settings.noPathMessage = value;
            await plugin.saveSettings();
            await plugin.drawTrail();
          })
      );

    new Setting(trailDetails)
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
            await plugin.drawTrail();
          })
      );

    const visModalDetails: HTMLDetailsElement = containerEl.createEl("details");
    visModalDetails.createEl("summary", { text: "Visualisation Modal" });

    new Setting(visModalDetails)
      .setName("Default Visualisation Type")
      .setDesc("Which visualisation to show by defualt")
      .addDropdown((cb: DropdownComponent) => {
        VISTYPES.forEach((option: visTypes) => {
          cb.addOption(option, option);
        });
        cb.setValue(plugin.settings.visGraph);

        cb.onChange(async (value: visTypes) => {
          plugin.settings.visGraph = value;
          await plugin.saveSettings();
        });
      });
    new Setting(visModalDetails)
      .setName("Default Relation")
      .setDesc("Which relation type to show first when opening the modal")
      .addDropdown((cb: DropdownComponent) => {
        RELATIONS.forEach((option: Relations) => {
          cb.addOption(option, option);
        });
        cb.setValue(plugin.settings.visRelation);

        cb.onChange(async (value: Relations) => {
          plugin.settings.visRelation = value;
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
        cb.setValue(plugin.settings.visClosed);

        cb.onChange(async (value: string) => {
          plugin.settings.visClosed = value;
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
        cb.setValue(plugin.settings.visAll);

        cb.onChange(async (value: string) => {
          plugin.settings.visAll = value;
          await plugin.saveSettings();
        });
      });

    const createIndexDetails: HTMLDetailsElement =
      containerEl.createEl("details");
    createIndexDetails.createEl("summary", { text: "Create Index" });

    new Setting(createIndexDetails)
      .setName("Add wiklink brackets")
      .setDesc(
        "When creating an index, should it wrap the note name in wikilinks `[[]]` or not. On = yes, off = no."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(plugin.settings.wikilinkIndex)
          .onChange(async (value) => {
            plugin.settings.wikilinkIndex = value;
            await plugin.saveSettings();
          })
      );

    new Setting(createIndexDetails)
      .setName("Show aliases of notes in index")
      .setDesc("Show the aliases of each note in brackets. On = yes, off = no.")
      .addToggle((toggle) =>
        toggle
          .setValue(plugin.settings.aliasesInIndex)
          .onChange(async (value) => {
            console.log(value);
            plugin.settings.aliasesInIndex = value;
            await plugin.saveSettings();
          })
      );

    const debugDetails: HTMLDetailsElement = containerEl.createEl("details");
    debugDetails.createEl("summary", { text: "Debugging" });

    new Setting(debugDetails)
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

    new Setting(debugDetails)
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
