import { details } from "./BreadcrumbsSettingTab";
import type BCPlugin from "../main";
import { Setting } from "obsidian";
import { refreshIndex } from "../refreshIndex";

export function addRelationSettings(
  plugin: BCPlugin,
  containerEl: HTMLElement
) {
  const { settings } = plugin;
  const relationDetails = details("Relationships", containerEl);

  // MarkdownRenderer.renderMarkdown(
  //   "```mermaid\nflowchart BT\nMe -->|up| Dad\nDad -->|same| Aunt\nMe -->|up| Aunt\n```",
  //   containerEl,
  //   "",
  //   null
  // );

  relationDetails.createEl("p", {
    text: "Here you can toggle on/off different types of implied relationships. All of your explicit (real) relationships will still show, but you can choose which implied ones get filled in.\nAll implied relationships are given a CSS class of the type of implied relaiton, so you can style the differently. For example `.BC-Aunt`.",
  });

  new Setting(relationDetails)
    .setName("Same Parent is Siblings")
    .setDesc("If one note shares a parent with another, treat them as siblings")
    .addToggle((tg) =>
      tg
        .setValue(settings.impliedRelations.sameParentIsSibling)
        .onChange(async (val) => {
          settings.impliedRelations.sameParentIsSibling = val;
          await plugin.saveSettings();
          await refreshIndex(plugin);
        })
    );
  new Setting(relationDetails)
    .setName("Siblings' Siblings")
    .setDesc("Treat your siblings' siblings as your siblings")
    .addToggle((tg) =>
      tg
        .setValue(settings.impliedRelations.siblingsSiblingIsSibling)
        .onChange(async (val) => {
          settings.impliedRelations.siblingsSiblingIsSibling = val;
          await plugin.saveSettings();
          await refreshIndex(plugin);
        })
    );

  new Setting(relationDetails)
    .setName("Aunt/Uncle")
    .setDesc("Treat your parent's siblings as your parents (aunts/uncles)")
    .addToggle((tg) =>
      tg
        .setValue(settings.impliedRelations.parentsSiblingsIsParents)
        .onChange(async (val) => {
          settings.impliedRelations.parentsSiblingsIsParents = val;
          await plugin.saveSettings();
          await refreshIndex(plugin);
        })
    );
  new Setting(relationDetails)
    .setName("Cousins")
    .setDesc(
      "Treat the cousins of a note as siblings (parents' siblings' children are cousins)"
    )
    .addToggle((tg) =>
      tg
        .setValue(settings.impliedRelations.cousinsIsSibling)
        .onChange(async (val) => {
          settings.impliedRelations.cousinsIsSibling = val;
          await plugin.saveSettings();
          await refreshIndex(plugin);
        })
    );

  new Setting(relationDetails)
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
          await refreshIndex(plugin);
        })
    );
}
