import Checkboxes from "../Components/Checkboxes.svelte";
import type BCPlugin from "../main";
import { getFields } from "../Utils/HierUtils";
import { subDetails } from "./BreadcrumbsSettingTab";

export function addJumpToNextSettings(
  plugin: BCPlugin,
  viewDetails: HTMLDetailsElement
) {
  const { settings } = plugin;
  const jumpToDirDetails = subDetails("Jump to Next Direction", viewDetails);

  new Checkboxes({
    target: jumpToDirDetails,
    props: {
      plugin,
      settingName: "limitJumpToFirstFields",
      options: getFields(settings.userHiers),
    },
  });
}
