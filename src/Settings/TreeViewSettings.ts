import { Setting } from "obsidian";
import type BCPlugin from "../main";
import { subDetails } from "./BreadcrumbsSettingTab";

export function addTreeViewSettings(
  plugin: BCPlugin,
  viewDetails: HTMLDetailsElement
) {
  const { settings } = plugin;
  const treeViewDetails = subDetails("Tree View", viewDetails);
}
