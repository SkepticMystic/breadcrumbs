import { Notice, Setting } from "obsidian";
import type BCPlugin from "../main";
import { refreshIndex } from "../refreshIndex";
import { splitAndTrim } from "../Utils/generalUtils";
import { details, fragWithHTML } from "./BreadcrumbsSettingTab";

export function addGeneralSettings(plugin: BCPlugin, containerEl: HTMLElement) {
  const { settings } = plugin;
  const generalDetails = details("General Options", containerEl);

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
        .setTooltip("Tree View")
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
      toggle.setValue(settings.refreshOnNoteChange).onChange(async (value) => {
        settings.refreshOnNoteChange = value;
        await plugin.saveSettings();
      })
    );

  new Setting(generalDetails)
    .setName("Refresh Index On Note Save")
    .addToggle((toggle) =>
      toggle.setValue(settings.refreshOnNoteSave).onChange(async (value) => {
        settings.refreshOnNoteSave = value;
        await plugin.saveSettings();
      })
    );

  new Setting(generalDetails)
    .setName("Show up fields in Juggl")
    .setDesc("Juggl will show both up and down fields")
    .addToggle((toggle) => {
      toggle.setValue(settings.showUpInJuggl).onChange(async (value) => {
        settings.showUpInJuggl = value;
        await plugin.saveSettings();
      });
    });

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
    .setName("Only show first alias")
    .setDesc(
      "If a note has an alias (using the fields in the setting above), should only the first one be shown?"
    )
    .addToggle((toggle) =>
      toggle.setValue(!settings.showAllAliases).onChange(async (value) => {
        settings.showAllAliases = !value;
        await plugin.saveSettings();
        await refreshIndex(plugin);
      })
    );

  new Setting(generalDetails)
    .setName("Use yaml or inline fields for hierarchy data")
    .setDesc(
      "If enabled, Breadcrumbs will make it's hierarchy using yaml fields, and inline fields (if you have Dataview enabled).\nIf this is disabled, it will only use Juggl links for it's metadata (See below)."
    )
    .addToggle((toggle) =>
      toggle.setValue(settings.useAllMetadata).onChange(async (value) => {
        settings.useAllMetadata = value;
        await plugin.saveSettings();
        await refreshIndex(plugin);
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

  if (plugin.app.plugins.plugins.dataview !== undefined) {
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
}
