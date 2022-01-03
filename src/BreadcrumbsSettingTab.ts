import log from "loglevel";
import {
  App,
  DropdownComponent,
  MomentFormatComponent,
  Notice,
  PluginSettingTab,
  Setting,
} from "obsidian";
import { isInVault, openView } from "obsidian-community-lib";
import Checkboxes from "./Components/Checkboxes.svelte";
import KoFi from "./Components/KoFi.svelte";
import UserHierarchies from "./Components/UserHierarchies.svelte";
import {
  ALLUNLINKED,
  ARROW_DIRECTIONS,
  DEFAULT_SETTINGS,
  DIRECTIONS,
  MATRIX_VIEW,
  REAlCLOSED,
  RELATIONS,
  VISTYPES,
} from "./constants";
import type { DebugLevel, Relations, visTypes } from "./interfaces";
import type BCPlugin from "./main";
import MatrixView from "./MatrixView";
import { getFields, splitAndTrim } from "./sharedFunctions";

const fragWithHTML = (html: string) =>
  createFragment((frag) => (frag.createDiv().innerHTML = html));

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
    containerEl.createEl("h2", { text: "Settings for Breadcrumbs plugin" });

    const details = (text: string, parent = containerEl) =>
      parent.createEl("details", {}, (d) => d.createEl("summary", { text }));

    const subDetails = (text: string, parent: HTMLDetailsElement) =>
      parent
        .createDiv({
          attr: { style: "padding-left: 10px;" },
        })
        .createEl("details", {}, (d) => d.createEl("summary", { text }));

    const fieldDetails = details("Hierarchies");

    fieldDetails.createEl("p", {
      text: "Here you can set up different hierarchies you use in your vault. To add a new hierarchy, click the plus button. Then, fill in the field names of your hierachy into the 3 boxes that appear. The ↑ field is for parent relations, the → field is for siblings, and ↓ is for child relations.",
    });
    fieldDetails.createEl("p", {
      text: "For each direction (up, same, down), you can enter multiple field names in a comma seperated list. For example: `parent, broader, upper`",
    });

    new UserHierarchies({
      target: fieldDetails,
      props: { plugin },
    });

    const generalDetails = details("General Options");

    new Setting(generalDetails)
      .setName("Show Refresh Index Notice")
      .setDesc(
        "When Refreshing Index, should it show a notice once the operation is complete?"
      )
      .addToggle((toggle) =>
        toggle.setValue(settings.showRefreshNotice).onChange(async (value) => {
          settings.showRefreshNotice = value;
          await plugin.saveSettings();
        })
      );

    new Setting(generalDetails)
      .setName("Open Views by Default")
      .setDesc("Choose which of the views to open onload")
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
          .setTooltip("Stats View")
          .setValue(settings.openStatsOnLoad)
          .onChange(async (value) => {
            settings.openStatsOnLoad = value;
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
          .setTooltip("Down View")
          .setValue(settings.openDownOnLoad)
          .onChange(async (value) => {
            settings.openDownOnLoad = value;
            await plugin.saveSettings();
          });
      });

    new Setting(generalDetails)
      .setName("Refresh Index on Note Change")
      .setDesc(
        "Refresh the Breadcrumbs index data everytime you change notes.\nThis is how Breadcrumbs used to work, making it responsive to changes immediately after changing notes. However, this can be very slow on large vaults, so it is off by default."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(settings.refreshOnNoteChange)
          .onChange(async (value) => {
            settings.refreshOnNoteChange = value;
            await plugin.saveSettings();
          })
      );

    new Setting(generalDetails)
      .setName("Fields used for Alternative note names (Aliases)")
      .setDesc(
        fragWithHTML(
          "A comma-separated list of fields you use to specify note name aliases. These fields will be checked, in order, and be used to display an alternate note title in both the list/matrix view, and trail/grid view.</br>This field will probably be <code>alias</code> or <code>aliases</code>, but it can be anything, like <code>title</code>, for example."
        )
      )
      .addText((text) => {
        text.setValue(settings.altLinkFields.join(", "));
        text.inputEl.onblur = async () => {
          settings.altLinkFields = splitAndTrim(text.getValue());
          await plugin.saveSettings();
        };
      });

    new Setting(generalDetails)
      .setName("Use yaml or inline fields for hierarchy data")
      .setDesc(
        "If enabled, Breadcrumbs will make it's hierarchy using yaml fields, and inline fields (if you have Dataview enabled).\nIf this is disabled, it will only use Juggl links for it's metadata (See below)."
      )
      .addToggle((toggle) =>
        toggle.setValue(settings.useAllMetadata).onChange(async (value) => {
          settings.useAllMetadata = value;
          await plugin.saveSettings();
          await plugin.refreshIndex();
        })
      );

    new Setting(generalDetails)
      .setName("Use Juggl link syntax without having Juggl installed.")
      .setDesc(
        fragWithHTML(
          'Should Breadcrumbs look for <a href="https://juggl.io/Link+Types">Juggl links</a> even if you don\'t have Juggl installed? If you do have Juggl installed, it will always look for Juggl links.'
        )
      )
      .addToggle((toggle) =>
        toggle
          .setValue(settings.parseJugglLinksWithoutJuggl)
          .onChange(async (value) => {
            settings.parseJugglLinksWithoutJuggl = value;
            await plugin.saveSettings();
          })
      );

    generalDetails.createDiv().createEl("strong", {
      text: "When running `Jump to first <direction>` command, limit which fields it can use.",
    });

    new Checkboxes({
      target: generalDetails,
      props: {
        plugin: this.plugin,
        settingName: "limitJumpToFirstFields",
        options: getFields(settings.userHiers),
      },
    });

    if (this.app.plugins.plugins.dataview !== undefined) {
      new Setting(generalDetails)
        .setName("Dataview Wait Time")
        .setDesc(
          'Enter an integer number of seconds to wait for the Dataview Index to load. The larger your vault, the longer it will take.\nIf you see an error in the console saying "Cannot destructure currGraphs of undefined", try making this time longer. If you don\'t get that error, you can make this time shorter to make the Breadcrumbs load faster. The default is 5 seconds.'
        )
        .addText((text) =>
          text
            .setPlaceholder("Seconds")
            .setValue((settings.dvWaitTime / 1000).toString())
            .onChange(async (value) => {
              const num = Number(value);

              if (num > 0) {
                settings.dvWaitTime = num * 1000;
                await plugin.saveSettings();
              } else {
                new Notice("The interval must be a non-negative number");
              }
            })
        );
    }

    const viewDetails = details("Views");
    const MLViewDetails = subDetails("Matrix/List View", viewDetails);

    new Setting(MLViewDetails)
      .setName("Show Matrix or List view by default")
      .setDesc(
        "When Obsidian first loads, which view should it show? ✅ = Matrix, ❌ = List"
      )
      .addToggle((toggle) =>
        toggle.setValue(settings.defaultView).onChange(async (value) => {
          settings.defaultView = value;
          await plugin.saveSettings();
        })
      );

    // TODO I don't think this setting works anymore. I removed it's functionality when adding multiple hierarchies
    // new Setting(MLViewDetails)
    //   .setName("Show all field names or just relation types")
    //   .setDesc(
    //     "This changes the headers in matrix/list view. You can have the headers be the list of metadata fields for each relation type (e.g. `parent, broader, upper`). Or you can have them just be the name of the relation type, i.e. 'Parent', 'Sibling', 'Child'. ✅ = show the full list of names."
    //   )
    //   .addToggle((toggle) =>
    //     toggle.setValue(settings.showNameOrType).onChange(async (value) => {
    //       settings.showNameOrType = value;
    //       await plugin.saveSettings();
    //       await plugin.getActiveTYPEView(MATRIX_VIEW).draw();
    //     })
    //   );

    new Setting(MLViewDetails)
      .setName("Show Relationship Type")
      .setDesc(
        fragWithHTML(
          "Show whether a link is real or implied. A real link is one you explicitly put in a note. E.g. <code>parent:: [[Note]]</code>. An implied link is the reverse of a real link. For example, if A is the real parent of B, then B must be the implied child of A."
        )
      )
      .addToggle((toggle) =>
        toggle.setValue(settings.showRelationType).onChange(async (value) => {
          settings.showRelationType = value;
          await plugin.saveSettings();
          await plugin.getActiveTYPEView(MATRIX_VIEW).draw();
        })
      );

    new Setting(MLViewDetails)
      .setName("Directions Order")
      .setDesc(
        fragWithHTML(
          `Change the order in which the directions appear in the M/L view. Use numbers to change the order, the default is "up, same, down, next, prev" (<code>01234</code>).
          <ul>
            <li>0 = up</li>
            <li>1 = same</li>
            <li>2 = down</li>
            <li>3 = next</li>
            <li>4 = prev</li>
          </ul>
          <strong>Note:</strong> You can only change the order of the directions. You can't add or remove directions.`
        )
      )
      .addText((text) => {
        text.setValue(settings.squareDirectionsOrder.join(""));
        text.inputEl.onblur = async () => {
          const value = text.getValue();
          if (
            value.length === 5 &&
            value.includes("0") &&
            value.includes("1") &&
            value.includes("2") &&
            value.includes("3") &&
            value.includes("4")
          ) {
            settings.squareDirectionsOrder = value
              .split("")
              .map((order) => Number.parseInt(order));
            await plugin.saveSettings();
            await plugin.getActiveTYPEView(MATRIX_VIEW).draw();
          } else {
            new Notice(
              'The value must be a 5 digit number using only the digits "0", "1", "2", "3", "4"'
            );
          }
        };
      });

    new Setting(MLViewDetails)
      .setName("Enable Alpahebtical Sorting")
      .setDesc(
        "By default, items in the Matrix view are sorted by the order they appear in your notes. Toggle this on to enable Alphabetical sorting. You can choose ascending/descending order in the setting below."
      )
      .addToggle((toggle) =>
        toggle.setValue(settings.enableAlphaSort).onChange(async (value) => {
          settings.enableAlphaSort = value;
          await plugin.saveSettings();
          await plugin.getActiveTYPEView(MATRIX_VIEW).draw();
        })
      );

    // TODO hide this setting if !enableAlphaSort
    new Setting(MLViewDetails)
      .setName("Sort Alphabetically Ascending/Descending")
      .setDesc(
        "Sort square items alphabetically in Ascending (✅) or Descending (❌) order, by default."
      )
      .addToggle((toggle) =>
        toggle.setValue(settings.alphaSortAsc).onChange(async (value) => {
          settings.alphaSortAsc = value;
          await plugin.saveSettings();
          await plugin.getActiveTYPEView(MATRIX_VIEW).draw();
        })
      );

    new Setting(MLViewDetails)
      .setName("Make Current Note an Implied Sibling")
      .setDesc(
        "Techincally, the current note is always it's own implied sibling. By default, it is not show as such. Toggle this on to make it show."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(settings.treatCurrNodeAsImpliedSibling)
          .onChange(async (value) => {
            settings.treatCurrNodeAsImpliedSibling = value;
            await plugin.saveSettings();
            await plugin.getActiveTYPEView(MATRIX_VIEW).draw();
          })
      );

    new Setting(MLViewDetails)
      .setName("Show Implied Relations")
      .setDesc("Whether or not to show implied relations at all.")
      .addToggle((toggle) =>
        toggle
          .setValue(settings.showImpliedRelations)
          .onChange(async (value) => {
            settings.showImpliedRelations = value;
            await plugin.saveSettings();
            await plugin.getActiveTYPEView(MATRIX_VIEW).draw();
          })
      );

    new Setting(MLViewDetails)
      .setName("Filter Implied Siblings")
      .setDesc(
        fragWithHTML(
          `Implied siblings are:
          <ol>
            <li>notes with the same parent, or</li>
            <li>notes that are real siblings.</li>
          </ol>
          This setting only applies to type 1 implied siblings. If enabled, Breadcrumbs will filter type 1 implied siblings so that they not only share the same parent, but the parent relation has the exact same type. For example, the two real relations <code>B -parent-> A</code>, and <code>C -parent-> A</code> create an implied sibling between B and C (they have the same parent, A). The two real relations <code>B -parent-> A</code>, and <code>C -up-> A</code> create an implied sibling between B and C (they also have the same parent, A). But if this setting is turned on, the second implied sibling would not show, because the parent types are differnet (parent versus up).`
        )
      )
      .addToggle((toggle) =>
        toggle
          .setValue(settings.filterImpliedSiblingsOfDifferentTypes)
          .onChange(async (value) => {
            settings.filterImpliedSiblingsOfDifferentTypes = value;
            await plugin.saveSettings();
            await plugin.getActiveTYPEView(MATRIX_VIEW).draw();
          })
      );

    new Setting(MLViewDetails)
      .setName("Open View in Right or Left side")
      .setDesc(
        "When loading the matrix view, should it open on the left or right side leaf? ✅ = Right, ❌ = Left."
      )
      .addToggle((toggle) =>
        toggle.setValue(settings.rlLeaf).onChange(async (value) => {
          settings.rlLeaf = value;
          await plugin.saveSettings();
          await this.app.workspace.detachLeavesOfType(MATRIX_VIEW);
          await openView(
            this.app,
            MATRIX_VIEW,
            MatrixView,
            value ? "right" : "left"
          );
        })
      );

    const trailDetails = subDetails("Trail/Grid", viewDetails);

    new Setting(trailDetails)
      .setName("Show Breadcrumbs")
      .setDesc("Show a set of different views at the top of the current note.")
      .addToggle((toggle) =>
        toggle.setValue(settings.showBCs).onChange(async (value) => {
          settings.showBCs = value;
          await plugin.saveSettings();
          await plugin.drawTrail();
        })
      );

    new Setting(trailDetails)
      .setName("Show Breadcrumbs in Edit/Live-Preview Mode")
      .setDesc(
        "It always shows in preview mode, but should it also show in the other two?\n\nKeep in mind that there is currently a limitation where the Breadcrumbs view will be stuck to the top of the note in edit/LP mode, even if you scroll down."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(settings.showBCsInEditLPMode)
          .onChange(async (value) => {
            settings.showBCsInEditLPMode = value;
            await plugin.saveSettings();
            await plugin.drawTrail();
          })
      );

    const limitTrailFieldsDiv = trailDetails.createDiv({
      cls: "limit-ML-fields",
    });
    limitTrailFieldsDiv.createEl("strong", {
      text: "Limit Trail View to only show certain fields",
    });

    new Checkboxes({
      target: trailDetails,
      props: {
        plugin: this.plugin,
        settingName: "limitTrailCheckboxes",
        options: getFields(settings.userHiers, "up"),
      },
    });

    new Setting(trailDetails)
      .setName("Views to show")
      .setDesc(
        "Choose which of the views to show at the top of the note.\nTrail, Grid, and/or the Next-Previous view."
      )
      .addToggle((toggle) => {
        toggle
          .setTooltip("Show Trail view")
          .setValue(settings.showTrail)
          .onChange(async (value) => {
            settings.showTrail = value;
            await plugin.saveSettings();
            await plugin.drawTrail();
          });
      })
      .addToggle((toggle) => {
        toggle
          .setTooltip("Show Grid view")
          .setValue(settings.showGrid)
          .onChange(async (value) => {
            settings.showGrid = value;
            await plugin.saveSettings();
            await plugin.drawTrail();
          });
      })
      .addToggle((toggle) => {
        toggle
          .setTooltip("Show Next/Previous view")
          .setValue(settings.showPrevNext)
          .onChange(async (value) => {
            settings.showPrevNext = value;
            await plugin.saveSettings();
            await plugin.drawTrail();
          });
      });

    new Setting(trailDetails)
      .setName("Grid view dots")
      .setDesc(
        "If the grid view is visible, shows dots based on the file size of each cell."
      )
      .addToggle((toggle) =>
        toggle.setValue(settings.gridDots).onChange(async (value) => {
          settings.gridDots = value;
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

    dotsColourPicker.value = settings.dotsColour;
    dotsColourPicker.addEventListener("change", async () => {
      settings.dotsColour = dotsColourPicker.value;
      await plugin.saveSettings();
    });

    new Setting(trailDetails)
      .setName("Grid view heatmap")
      .setDesc(
        "If the grid view is visible, change the background colour of squares based on the number of children leaving that note."
      )
      .addToggle((toggle) =>
        toggle.setValue(settings.gridHeatmap).onChange(async (value) => {
          settings.gridHeatmap = value;
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

    heatmapColourPicker.value = settings.heatmapColour;
    heatmapColourPicker.addEventListener("change", async () => {
      settings.heatmapColour = heatmapColourPicker.value;
      await plugin.saveSettings();
    });

    new Setting(trailDetails)
      .setName("Index Note(s)")
      .setDesc(
        fragWithHTML(
          "The note that all of your other notes lead back to. The parent of all your parent notes. Just enter the basename. So if your index note is <code>000 Home.md</code>, enter <code>000 Home</code>. You can also have multiple index notes (comma-separated list). The breadcrumb trail will show the shortest path back to any one of the index notes listed. You can now leave this field empty, meaning the trail will show a path going as far up the parent-tree as possible."
        )
      )
      .addText((text) => {
        text
          .setPlaceholder("Index Note")
          .setValue(settings.indexNotes.join(", "));

        text.inputEl.onblur = async () => {
          const splits = splitAndTrim(text.getValue());
          if (
            splits[0] === undefined ||
            splits.every((index) => isInVault(this.app, index))
          ) {
            settings.indexNotes = splits;
            await plugin.saveSettings();
          } else {
            new Notice(`Atleast one of the notes is not in your vault`);
          }
        };
      });

    new Setting(trailDetails)
      .setName("Shows all paths if none to index note are found")
      .setDesc(
        "If you have an index notes chosen, but the trail view has no paths going up to those index notes, should it show all paths instead?"
      )
      .addToggle((toggle) =>
        toggle
          .setValue(settings.showAllPathsIfNoneToIndexNote)
          .onChange(async (value) => {
            settings.showAllPathsIfNoneToIndexNote = value;

            await plugin.saveSettings();
            await plugin.drawTrail();
          })
      );

    new Setting(trailDetails)
      .setName("Default: All or Shortest")
      .setDesc(
        "If multiple paths are found going up the parent tree, should all of them be shown by default, or only the shortest? ✅ = all, ❌ = shortest"
      )
      .addToggle((toggle) =>
        toggle.setValue(settings.showAll).onChange(async (value) => {
          settings.showAll = value;

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
          .setValue(settings.trailSeperator)
          .onChange(async (value) => {
            settings.trailSeperator = value;
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
          .setValue(settings.noPathMessage)
          .onChange(async (value) => {
            settings.noPathMessage = value;
            await plugin.saveSettings();
            await plugin.drawTrail();
          })
      );

    new Setting(trailDetails)
      .setName("Respect Readable Line Length")
      .setDesc(
        "Should the breadcrumbs trail adjust its width to the readable line length, or use as much space as possible? ✅ = use readable line length."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(settings.respectReadableLineLength)
          .onChange(async (value) => {
            settings.respectReadableLineLength = value;
            await plugin.saveSettings();
            await plugin.drawTrail();
          })
      );

    const downViewDetails = subDetails("Down View", viewDetails);

    new Setting(downViewDetails)
      .setName("Enable line wrapping")
      .setDesc(
        "Make the items in the down view line wrap when there isn't enough space (✅). ❌ makes them overflow off the screen."
      )
      .addToggle((toggle) =>
        toggle.setValue(settings.downViewWrap).onChange(async (value) => {
          settings.downViewWrap = value;
          await plugin.saveSettings();
        })
      );

    const visModalDetails = subDetails("Visualisation Modal", viewDetails);

    new Setting(visModalDetails)
      .setName("Default Visualisation Type")
      .setDesc("Which visualisation to show by defualt")
      .addDropdown((cb: DropdownComponent) => {
        VISTYPES.forEach((option: visTypes) => {
          cb.addOption(option, option);
        });
        cb.setValue(settings.visGraph);

        cb.onChange(async (value: visTypes) => {
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

    const alternativeHierarchyDetails = details("Alternative Hierarchies");

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

    const tagNoteDetails = subDetails("Tag Notes", alternativeHierarchyDetails);

    new Setting(tagNoteDetails)
      .setName("Default Tag Note Field")
      .setDesc(
        fragWithHTML(
          "By default, tag notes use the first field in your hierarchies (usually an <code>↑</code> field). Choose a different one to use by default, without having to specify <code>BC-tag-note-field: {field}</code>."
        )
      )
      .addDropdown((dd: DropdownComponent) => {
        const options = {};
        getFields(settings.userHiers).forEach(
          (field) => (options[field] = field)
        );
        dd.addOptions(options);
        dd.onChange(async (field) => {
          settings.tagNoteField = field;
          await plugin.saveSettings();
          await plugin.refreshIndex();
        });
      });

    const hierarchyNoteDetails = subDetails(
      "Hierarchy Notes",
      alternativeHierarchyDetails
    );

    new Setting(hierarchyNoteDetails)
      .setName("Hierarchy Note(s)")
      .setDesc("A list of notes used to create external Breadcrumb structures.")
      .addText((text) => {
        text
          .setPlaceholder("Hierarchy Note(s)")
          .setValue(settings.hierarchyNotes.join(", "));

        text.inputEl.onblur = async () => {
          const splits = splitAndTrim(text.getValue());
          if (splits[0] === undefined) {
            settings.hierarchyNotes = splits;
            await plugin.saveSettings();
          } else if (splits.every((note) => isInVault(this.app, note))) {
            settings.hierarchyNotes = splits;
            await plugin.saveSettings();
          } else {
            new Notice("Atleast one of the notes is not in your vault");
          }
        };
      });

    new Setting(hierarchyNoteDetails)
      .setName("Hierarchy Note Up Field Name")
      .setDesc(
        "Using the breadcrumbs generated by the hierarchy note, which ↑ type should they count as? This has to be one of the ↑ types of one of your existing hierarchies. If you want it to be something else, you can make a new hierarchy just for it."
      )
      .addText((text) => {
        let finalValue: string = settings.HNUpField;
        text.setPlaceholder("").setValue(settings.HNUpField);

        text.inputEl.onblur = async () => {
          finalValue = text.getValue();
          if (finalValue === "") {
            settings.HNUpField = finalValue;
            await plugin.saveSettings();
          } else {
            const upFields = getFields(settings.userHiers, "up");
            if (upFields.includes(finalValue)) {
              settings.HNUpField = finalValue;
              await plugin.saveSettings();
            } else {
              new Notice(
                "The field name must be one of the exisitng ↓ fields in your hierarchies."
              );
            }
          }
        };
      });

    const csvDetails = subDetails("CSV Notes", alternativeHierarchyDetails);

    new Setting(csvDetails)
      .setName("CSV Breadcrumb Paths")
      .setDesc("The file path of a csv files with breadcrumbs information.")
      .addText((text) => {
        text.setValue(settings.CSVPaths);
        text.inputEl.onblur = async () => {
          settings.CSVPaths = text.inputEl.value;
          await plugin.saveSettings();
        };
      });

    const dendronDetails = subDetails(
      "Dendron Notes",
      alternativeHierarchyDetails
    );

    new Setting(dendronDetails)
      .setName("Add Dendron notes to graph")
      .setDesc(
        fragWithHTML(
          "Dendron notes create a hierarchy using note names.</br><code>nmath.algebra</code> is a note about algebra, whose parent is <code>math</code>.</br><code>nmath.calculus.limits</code> is a note about limits whose parent is the note <code>math.calculus</code>, the parent of which is <code>math</code>."
        )
      )
      .addToggle((toggle) =>
        toggle.setValue(settings.addDendronNotes).onChange(async (value) => {
          settings.addDendronNotes = value;
          await plugin.saveSettings();
        })
      );
    new Setting(dendronDetails)
      .setName("Dendron note delimiter")
      .setDesc(
        fragWithHTML(
          "If you choose to use Dendron notes (setting above), which delimiter should Breadcrumbs look for? The default is <code>.</code>."
        )
      )
      .addText((text) => {
        text
          .setPlaceholder("Delimiter")
          .setValue(settings.dendronNoteDelimiter);

        text.inputEl.onblur = async () => {
          const value = text.getValue();
          if (value) {
            settings.dendronNoteDelimiter = value;
            await plugin.saveSettings();
          } else {
            new Notice(`The delimiter can't be blank`);
            settings.dendronNoteDelimiter =
              DEFAULT_SETTINGS.dendronNoteDelimiter;
            await plugin.saveSettings();
          }
        };
      });

    new Setting(dendronDetails)
      .setName("Trim Dendron Note Names")
      .setDesc(
        fragWithHTML(
          "When displaying a dendron note name, should it be trimmed to only show the last item in the chain?</br>e.g. <code>A.B.C</code> would be trimmed to only display <code>C</code>."
        )
      )
      .addToggle((toggle) =>
        toggle.setValue(settings.trimDendronNotes).onChange(async (value) => {
          settings.trimDendronNotes = value;
          await plugin.saveSettings();
          await plugin.getActiveTYPEView(MATRIX_VIEW).draw();
        })
      );

    const fields = getFields(settings.userHiers);

    if (!fields.includes(settings.dendronNoteField)) {
      settings.dendronNoteField = fields[0];
      await plugin.saveSettings();
    }
    new Setting(dendronDetails)
      .setName("Dendron Note Field")
      .setDesc("Which field should Breadcrumbs use for Dendron notes?")
      .addDropdown((cb: DropdownComponent) => {
        fields.forEach((field) => {
          cb.addOption(field, field);
        });
        cb.setValue(settings.dendronNoteField);

        cb.onChange(async (value) => {
          settings.dendronNoteField = value;
          await plugin.saveSettings();
        });
      });

    const cmdsDetails = details("Commands");
    const writeBCsToFileDetails = subDetails(
      "Write Breadcrumbs to File",
      cmdsDetails
    );

    const limitWriteBCDiv = writeBCsToFileDetails.createDiv({
      cls: "limit-ML-fields",
    });
    limitWriteBCDiv.createEl("strong", {
      text: "Limit to only write certain fields to files",
    });

    new Checkboxes({
      target: writeBCsToFileDetails,
      props: {
        plugin,
        options: getFields(settings.userHiers),
        settingName: "limitWriteBCCheckboxes",
      },
    });

    new Setting(writeBCsToFileDetails)
      .setName("Write BCs to file Inline")
      .setDesc(
        "When writing BCs to file, should they be written inline (using Dataview syntax), or into the YAML of the note?"
      )
      .addToggle((toggle) =>
        toggle.setValue(settings.writeBCsInline).onChange(async (value) => {
          settings.writeBCsInline = value;
          await plugin.saveSettings();
        })
      );

    new Setting(writeBCsToFileDetails)
      .setName(
        fragWithHTML(
          "Show the <code>Write Breadcrumbs to ALL Files</code> command"
        )
      )
      .setDesc(
        "This command attempts to update ALL files with implied breadcrumbs pointing to them. So, it is not shown by default (even though it has 3 confirmation boxes to ensure you want to run it"
      )
      .addToggle((toggle) =>
        toggle.setValue(settings.showWriteAllBCsCmd).onChange(async (value) => {
          settings.showWriteAllBCsCmd = value;
          await plugin.saveSettings();
        })
      );

    const createIndexDetails = subDetails("Create Index", cmdsDetails);

    new Setting(createIndexDetails)
      .setName("Add wiklink brackets")
      .setDesc(
        fragWithHTML(
          "When creating an index, should it wrap the note name in wikilinks <code>[[]]</code> or not.\n✅ = yes, ❌ = no."
        )
      )
      .addToggle((toggle) =>
        toggle.setValue(settings.wikilinkIndex).onChange(async (value) => {
          settings.wikilinkIndex = value;
          await plugin.saveSettings();
        })
      );

    new Setting(createIndexDetails)
      .setName("Show aliases of notes in index")
      .setDesc("Show the aliases of each note in brackets.\n✅ = yes, ❌ = no.")
      .addToggle((toggle) =>
        toggle.setValue(settings.aliasesInIndex).onChange(async (value) => {
          settings.aliasesInIndex = value;
          await plugin.saveSettings();
        })
      );

    const threadingDetails = subDetails("Threading", cmdsDetails);

    threadingDetails.createDiv({
      text: "Settings for the commands `Create new <field> from current note`",
    });
    new Setting(threadingDetails)
      .setName("Open new threads in new pane or current pane")
      .addToggle((tog) =>
        tog.onChange(async (value) => {
          settings.threadIntoNewPane = value;
          await plugin.saveSettings();
        })
      );

    new Setting(threadingDetails)
      .setName("New Note Name Template")
      .setDesc(
        fragWithHTML(
          `When threading into a new note, choose the template for the new note name.</br>
        The default is <code>{{field}} of {{current}}</code>.</br>
        Options include:</br>
        <ul>
        <li><code>{{field}}</code>: the field being thread into</li>
        <li><code>{{dir}}</code>: the direction being thread into</li>
        <li><code>{{current}}</code>: the current note name</li>
        <li><code>{{date}}</code>: the current date (Set the format in the setting below)</li>
        </ul>`
        )
      )
      .addText((text) => {
        text.setValue(settings.threadingTemplate);
        text.inputEl.onblur = async () => {
          settings.threadingTemplate = text.getValue();
          await plugin.saveSettings();
        };
      });
    const threadDirTemplatesSetting = new Setting(threadingDetails)
      .setClass("thread-dir-templates")
      .setName("Templater Template per Direction")
      .setDesc(
        fragWithHTML(
          `For each direction to be thread into, choose a Templater template to insert into the new note.</br>
          Give the basename, or the full file path (e.g. <code>Templates/Parent Template</code>).`
        )
      );

    DIRECTIONS.forEach((dir) =>
      threadDirTemplatesSetting.addText((text) => {
        text
          .setPlaceholder(ARROW_DIRECTIONS[dir])
          .setValue(settings.threadingDirTemplates[dir]);
        text.inputEl.onblur = async () => {
          settings.threadingDirTemplates[dir] = text.getValue();
          await plugin.saveSettings();
        };
      })
    );

    new Setting(threadingDetails)
      .setName("Date Format")
      .setDesc("The date format used in the Threading Template (setting above)")
      .addMomentFormat((format) => {
        format
          .setDefaultFormat(DEFAULT_SETTINGS.dateFormat)
          .setValue(settings.dateFormat)
          .onChange(async (value) => {
            settings.dateFormat = value;
            await plugin.saveSettings();
          });
      });

    const debugDetails = details("Debugging");

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

    new KoFi({ target: containerEl });
  }
}
