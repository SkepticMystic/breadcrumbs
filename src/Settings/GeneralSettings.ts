import { Notice, Setting } from "obsidian";
import type BCPlugin from "../main";
import { refreshIndex } from "../refreshIndex";
import { splitAndTrim } from "../Utils/generalUtils";
import { details, fragWithHTML } from "./BreadcrumbsSettingTab";

export function addGeneralSettings(plugin: BCPlugin, containerEl: HTMLElement) {
  const { settings } = plugin;
  const generalDetails = details("General Options", containerEl);

  new Setting(generalDetails)
    .setName("Refresh Index on Note Change")
    .setDesc(fragWithHTML(
      "Refresh the Breadcrumbs index data everytime you change notes.</br><strong>Note</strong>: This can be very slow on large vaults.")
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
    .setName("Alias Fields")
    .setDesc(
      fragWithHTML(
        "A comma-separated list of fields used to specify aliases. These fields will be checked, in order, to display an alternate note title in different views.</br>This field will probably be <code>alias</code> or <code>aliases</code>, but it can be anything, like <code>title</code>."
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
      "If enabled, Breadcrumbs will make it's hierarchy using yaml fields, and inline Dataview fields.\nIf this is disabled, it will only use Juggl links (See below)."
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
        'Should Breadcrumbs look for <a href="https://juggl.io/Link+Types" aria-label="https://juggl.io/Link+Types">Juggl links</a> even if you don\'t have Juggl installed? If you do have Juggl installed, it will always look for Juggl links.'
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


  new Setting(generalDetails)
    .setName("Enable Field Suggestor")
    .setDesc(
      fragWithHTML(
        'Alot of Breadcrumbs features require a metadata (or inline Dataview) field to work. For example, `BC-folder-note`.</br>The Field Suggestor will show an autocomplete menu with all available Breadcrumbs field options when you type <code>BC-</code> at the start of a line.'
      )
    )
    .addToggle((toggle) =>
      toggle.setValue(settings.fieldSuggestor).onChange(async (value) => {
        settings.fieldSuggestor = value;
        await plugin.saveSettings();
      })
    );
  new Setting(generalDetails)
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
  new Setting(generalDetails)
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

  if (plugin.app.plugins.plugins.dataview !== undefined) {
    new Setting(generalDetails)
      .setName("Dataview Wait Time")
      .setDesc(
        'Enter an integer number of seconds to wait for the Dataview Index to load. The larger your vault, the longer it will take. The default is 5 seconds.'
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
