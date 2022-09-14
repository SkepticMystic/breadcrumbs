import type { JugglLayouts } from "juggl-api";
import { DropdownComponent, Notice, Setting } from "obsidian";
import { isInVault } from "obsidian-community-lib/dist/utils";
import { TRAIL_LENGTHS } from "../constants";
import Checkboxes from "../Components/Checkboxes.svelte";
import type BCPlugin from "../main";
import { splitAndTrim } from "../Utils/generalUtils";
import { getFields } from "../Utils/HierUtils";
import { drawTrail } from "../Views/TrailView";
import { fragWithHTML, subDetails } from "./BreadcrumbsSettingTab";

export function addTrailViewSettings(
  plugin: BCPlugin,
  viewDetails: HTMLDetailsElement
) {
  const { settings } = plugin;
  const trailDetails = subDetails("Trail/Grid/Juggl", viewDetails);

  new Setting(trailDetails)
    .setName("Show Breadcrumbs in Edit/Live-Preview Mode")
    .setDesc(
      "It always shows in preview mode, but should it also show in the other two?"
    )
    .addToggle((toggle) =>
      toggle.setValue(settings.showBCsInEditLPMode).onChange(async (value) => {
        settings.showBCsInEditLPMode = value;
        await plugin.saveSettings();
        await drawTrail(plugin);
      })
    );

  trailDetails.createEl('hr')
  trailDetails.createDiv({
    cls: "setting-item-name",
    text: "Limit Trail View to only show certain fields",
  });

  new Checkboxes({
    target: trailDetails,
    props: {
      plugin,
      settingName: "limitTrailCheckboxes",
      options: getFields(settings.userHiers, "up"),
    },
  });

  const viewsToShow = new Setting(trailDetails)
    .setName("Views to show")
    .setDesc(
      "Choose which of the views to show at the top of the note. Juggl View requires the Juggl plugin."
    )
    .addToggle((toggle) => {
      toggle
        .setTooltip("Trail view")
        .setValue(settings.showTrail)
        .onChange(async (value) => {
          settings.showTrail = value;
          await plugin.saveSettings();
          await drawTrail(plugin);
        });
    })
    .addToggle((toggle) => {
      toggle
        .setTooltip("Grid view")
        .setValue(settings.showGrid)
        .onChange(async (value) => {
          settings.showGrid = value;
          await plugin.saveSettings();
          await drawTrail(plugin);
        });
    })
    .addToggle((toggle) => {
      toggle
        .setTooltip("Next/Previous view")
        .setValue(settings.showPrevNext)
        .onChange(async (value) => {
          settings.showPrevNext = value;
          await plugin.saveSettings();
          await drawTrail(plugin);
        });
    })

  if (app.plugins.plugins.juggl !== undefined) {
    viewsToShow.addToggle((toggle) => {
      toggle
        .setTooltip("Juggl view")
        .setValue(settings.showJuggl)
        .onChange(async (value) => {
          settings.showJuggl = value;
          await plugin.saveSettings();
          await drawTrail(plugin);
        });
    })
  }

  new Setting(trailDetails)
    .setName('Grid view depth')
    .setDesc('Limit the initial depth of the grid view')
    .addSlider((slider) => {
      slider
        .setLimits(0, 25, 1)
        .setValue(settings.gridDefaultDepth)
        .setDynamicTooltip();

      slider.sliderEl.onblur = async () => {
        settings.gridDefaultDepth = slider.getValue();
        await plugin.saveSettings();
        await drawTrail(plugin);
      }
    })


  new Setting(trailDetails)
    .setName("Index Note(s)")
    .setDesc(
      fragWithHTML(
        "The note that all of your other notes lead back to. The parent of all your parent notes. Just enter the basename.</br>You can also have multiple index notes (comma-separated list).</br>Leaving this field empty will make the trail show all paths going as far up the parent-tree as possible."
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
          splits.every((index) => isInVault(index))
        ) {
          settings.indexNotes = splits;
          await plugin.saveSettings();
        } else new Notice("Atleast one of the notes is not in your vault");

      };
    });

  new Setting(trailDetails)
    .setName("Shows all paths if none to index note are found")
    .setDesc(
      "If you have an index note chosen, but the trail view has no paths going up to those index notes, should it show all paths instead?"
    )
    .addToggle((toggle) =>
      toggle
        .setValue(settings.showAllPathsIfNoneToIndexNote)
        .onChange(async (value) => {
          settings.showAllPathsIfNoneToIndexNote = value;

          await plugin.saveSettings();
          await drawTrail(plugin);
        })
    );

  new Setting(trailDetails)
    .setName("Default: All, Longest, or Shortest")
    .setDesc(
      "If multiple paths are found going up the parent tree, which of them should show?"
    )
    .addDropdown(dd => {
      const options = {}
      TRAIL_LENGTHS.forEach(length => {
        options[length] = length;
      })

      dd.addOptions(options);
      dd.setValue(settings.showAll);
      dd.onChange(async (val) => {
        settings.showAll = val;
        await plugin.saveSettings();
        await drawTrail(plugin);
      })
    })

  new Setting(trailDetails)
    .setName("Seperator")
    .setDesc(fragWithHTML(
      "The character to show between crumbs in the breadcrumb trail. The default is <code>→</code>")
    )
    .addText((text) =>
      text
        .setPlaceholder("→")
        .setValue(settings.trailSeperator)
        .onChange(async (value) => {
          settings.trailSeperator = value;
          await plugin.saveSettings();
          await drawTrail(plugin);
        })
    );

  new Setting(trailDetails)
    .setName("No path found message")
    .setDesc(
      "The text to display when no path to the index note is found, or the current note has no parent."
    )
    .addText((text) =>
      text
        .setPlaceholder("No path to index note was found")
        .setValue(settings.noPathMessage)
        .onChange(async (value) => {
          settings.noPathMessage = value;
          await plugin.saveSettings();
          await drawTrail(plugin);
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
          await drawTrail(plugin);
        })
    );


  new Setting(trailDetails)
    .setName("Show up fields in Juggl")
    .setDesc("Juggl will show both up and down fields")
    .addToggle((toggle) => {
      toggle
        .setValue(settings.showUpInJuggl)
        .onChange(async (value) => {
          settings.showUpInJuggl = value;
          await plugin.saveSettings();
        });
    });

  new Setting(trailDetails)
    .setName("Juggl view layout")
    .setDesc(
      fragWithHTML(
        "The layout type to use for the Juggl view.<br>The hierarchy layout is most natural for Breadcrumbs, but for large graphs D3 Force is recommended."
      )
    )
    .addDropdown((dc: DropdownComponent) => {
      dc.addOption("hierarchy", "Hierarchy");
      dc.addOption("d3-force", "D3 Force");
      dc.addOption("cola", "Cola Force");
      dc.addOption("grid", "Grid");
      dc.addOption("concentric", "Concentric");

      dc.setValue(settings.jugglLayout);
      dc.onChange(async (value) => {
        settings.jugglLayout = value as JugglLayouts;
        await plugin.saveSettings();
        await drawTrail(plugin);
      });
    });
}
