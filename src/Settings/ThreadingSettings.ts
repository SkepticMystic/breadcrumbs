import { Setting } from "obsidian";
import { ARROW_DIRECTIONS, DEFAULT_SETTINGS, DIRECTIONS } from "../constants";
import type BCPlugin from "../main";
import { fragWithHTML, subDetails } from "./BreadcrumbsSettingTab";

export function addThreadingSettings(
  plugin: BCPlugin,
  cmdsDetails: HTMLDetailsElement
) {
  const { settings } = plugin;
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
}
