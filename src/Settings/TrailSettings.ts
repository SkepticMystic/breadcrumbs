import { Notice, Setting } from "obsidian";
import { isInVault } from "obsidian-community-lib/dist/utils";
import type BCPlugin from "../main";
import { getFields, splitAndTrim } from "../sharedFunctions";
import { drawTrail } from "../Views/TrailView";
import { fragWithHTML, subDetails } from "./BreadcrumbsSettingTab";
import Checkboxes from "../Components/Checkboxes.svelte";

export function addTrailViewSettings(
  plugin: BCPlugin,
  viewDetails: HTMLDetailsElement
) {
  const { settings, app } = plugin;
  const trailDetails = subDetails("Trail/Grid/Juggl", viewDetails);

  new Setting(trailDetails)
    .setName("Show Breadcrumbs")
    .setDesc("Show a set of different views at the top of the current note.")
    .addToggle((toggle) =>
      toggle.setValue(settings.showBCs).onChange(async (value) => {
        settings.showBCs = value;
        await plugin.saveSettings();
        await drawTrail(plugin);
      })
    );

  new Setting(trailDetails)
    .setName("Show Breadcrumbs in Edit/Live-Preview Mode")
    .setDesc(
      "It always shows in preview mode, but should it also show in the other two?\n\nKeep in mind that there is currently a limitation where the Breadcrumbs view will be stuck to the top of the note in edit/LP mode, even if you scroll down."
    )
    .addToggle((toggle) =>
      toggle.setValue(settings.showBCsInEditLPMode).onChange(async (value) => {
        settings.showBCsInEditLPMode = value;
        await plugin.saveSettings();
        await drawTrail(plugin);
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
      plugin,
      settingName: "limitTrailCheckboxes",
      options: getFields(settings.userHiers, "up"),
    },
  });

  new Setting(trailDetails)
    .setName("Views to show")
    .setDesc(
      "Choose which of the views to show at the top of the note.\nTrail, Grid, Juggl graph and/or the Next-Previous view. " +
        "Juggl requires having the Juggl plugin installed."
    )
    .addToggle((toggle) => {
      toggle
        .setTooltip("Show Trail view")
        .setValue(settings.showTrail)
        .onChange(async (value) => {
          settings.showTrail = value;
          await plugin.saveSettings();
          await drawTrail(plugin);
        });
    })
    .addToggle((toggle) => {
      toggle
        .setTooltip("Show Grid view")
        .setValue(settings.showGrid)
        .onChange(async (value) => {
          settings.showGrid = value;
          await plugin.saveSettings();
          await drawTrail(plugin);
        });
    })
    .addToggle((toggle) => {
      toggle
        .setTooltip("Show Juggl view")
        .setValue(settings.showJuggl)
        .onChange(async (value) => {
          settings.showJuggl = value;
          await plugin.saveSettings();
          await drawTrail(plugin);
        });
    })
    .addToggle((toggle) => {
      toggle
        .setTooltip("Show Next/Previous view")
        .setValue(settings.showPrevNext)
        .onChange(async (value) => {
          settings.showPrevNext = value;
          await plugin.saveSettings();
          await drawTrail(plugin);
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
        await drawTrail(plugin);
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
        await drawTrail(plugin);
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
          splits.every((index) => isInVault(app, index))
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
          await drawTrail(plugin);
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
        await drawTrail(plugin);
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
          await drawTrail(plugin);
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
}
