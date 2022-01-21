import { details } from "./BreadcrumbsSettingTab";
import UserHierarchies from "../Components/UserHierarchies.svelte";
import type BCPlugin from "../main";

export function addHierarchySettings(
  plugin: BCPlugin,
  containerEl: HTMLElement
) {
  const fieldDetails = details("Hierarchies", containerEl);

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
}
