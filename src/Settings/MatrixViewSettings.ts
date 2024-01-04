import { Notice, Setting } from "obsidian";
import { openView } from "obsidian-community-lib/dist/utils";
import { MATRIX_VIEW } from "../constants";
import type BCPlugin from "../main";
import MatrixView from "../Views/MatrixView";
import { fragWithHTML, subDetails } from "./BreadcrumbsSettingTab";

export function addMatrixViewSettings(
  plugin: BCPlugin,
  viewDetails: HTMLDetailsElement
) {
  const { settings } = plugin;
  const MLViewDetails = subDetails("Matrix View", viewDetails);

  new Setting(MLViewDetails)
    .setName("Show all field names or just relation types")
    .setDesc(fragWithHTML(
      "Show the list of metadata fields for each relation type (e.g. <code>parent, broader, upper</code>), or just the name of the relation type, i.e. '<code>Parent</code>', '<code>Sibling</code>', '<code>Child</code>'.</br>✅ = show the full list.")
    )
    .addToggle((toggle) =>
      toggle.setValue(settings.showNameOrType).onChange(async (value) => {
        settings.showNameOrType = value;
        await plugin.saveSettings();
        await plugin.getActiveTYPEView(MATRIX_VIEW).draw();
      })
    );

  new Setting(MLViewDetails)
    .setName("Show Relationship Type")
    .setDesc(
      fragWithHTML(
        "Show whether a link is real or implied."
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
        `Change the order in which the directions appear in the Matrix view.</br>The default is "up, same, down, next, prev" (<code>01234</code>).
          <ul>
            <li>0 → up</li>
            <li>1 → same</li>
            <li>2 → down</li>
            <li>3 → next</li>
            <li>4 → prev</li>
          </ul>
          <strong>Note</strong>: You can remove numbers to hide those directions in the Matrix View. For example, <code>02</code> will only show up and down, in that order.`
      )
    )
    .addText((text) => {
      text.setValue(settings.squareDirectionsOrder.join(""));
      text.inputEl.onblur = async () => {
        const value = text.getValue();
        const values = value.split("");
        if (
          value.length <= 5 &&
          values.every((value) => ["0", "1", "2", "3", "4"].includes(value))
        ) {
          settings.squareDirectionsOrder = values.map((order) =>
            Number.parseInt(order)
          ) as (0 | 1 | 2 | 3 | 4)[];
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
    .setName("Enable Alphabetical Sorting")
    .setDesc(
      "By default, items in the Matrix view are sorted by the order they appear in your notes. Toggle this on to enable alphabetical sorting."
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
      "Sort square items alphabetically in Ascending (✅) or Descending (❌) order."
    )
    .addToggle((toggle) =>
      toggle.setValue(settings.alphaSortAsc).onChange(async (value) => {
        settings.alphaSortAsc = value;
        await plugin.saveSettings();
        await plugin.getActiveTYPEView(MATRIX_VIEW).draw();
      })
    );

  new Setting(MLViewDetails)
    .setName("Sort by note name, but show alias")
    .setDesc(
      "When this is turned off, notes will first be sorted by their alias, and then by their name if no alias is found. Turn this on to sort by note name always, but still show the alias in the results."
    )
    .addToggle((toggle) =>
      toggle.setValue(settings.sortByNameShowAlias).onChange(async (value) => {
        settings.sortByNameShowAlias = value;
        await plugin.saveSettings();
        await plugin.getActiveTYPEView(MATRIX_VIEW).draw();
      })
    );

  new Setting(MLViewDetails)
    .setName("Show Implied Relations")
    .setDesc("Whether or not to show implied relations at all.")
    .addToggle((toggle) =>
      toggle.setValue(settings.showImpliedRelations).onChange(async (value) => {
        settings.showImpliedRelations = value;
        await plugin.saveSettings();
        await plugin.getActiveTYPEView(MATRIX_VIEW).draw();
      })
    );

  // TODO I don't think this setting works anymore. I removed it's functionality when adding multiple hierarchies
  // new Setting(MLViewDetails)
  //   .setName("Filter Implied Siblings")
  //   .setDesc(
  //     fragWithHTML(
  //       `Implied siblings are:
  //         <ol>
  //           <li>notes with the same parent, or</li>
  //           <li>notes that are real siblings.</li>
  //         </ol>
  //         This setting only applies to type 1 implied siblings. If enabled, Breadcrumbs will filter type 1 implied siblings so that they not only share the same parent, but the parent relation has the exact same type. For example, the two real relations <code>B -parent-> A</code>, and <code>C -parent-> A</code> create an implied sibling between B and C (they have the same parent, A). The two real relations <code>B -parent-> A</code>, and <code>C -up-> A</code> create an implied sibling between B and C (they also have the same parent, A). But if this setting is turned on, the second implied sibling would not show, because the parent types are differnet (parent versus up).`
  //     )
  //   )
  //   .addToggle((toggle) =>
  //     toggle
  //       .setValue(settings.filterImpliedSiblingsOfDifferentTypes)
  //       .onChange(async (value) => {
  //         settings.filterImpliedSiblingsOfDifferentTypes = value;
  //         await plugin.saveSettings();
  //         await plugin.getActiveTYPEView(MATRIX_VIEW).draw();
  //       })
  //   );

  new Setting(MLViewDetails)
    .setName("Open View in Right or Left side")
    .setDesc(
      "When loading the matrix view, should it open on the left or right side leaf? ✅ = Right, ❌ = Left."
    )
    .addToggle((toggle) =>
      toggle.setValue(settings.rlLeaf).onChange(async (value) => {
        settings.rlLeaf = value;
        await plugin.saveSettings();
        app.workspace.detachLeavesOfType(MATRIX_VIEW);
        await openView(
          MATRIX_VIEW,
          MatrixView,
          value ? "right" : "left"
        );
      })
    );
}
