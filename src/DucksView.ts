import { ItemView, WorkspaceLeaf } from "obsidian";
import Ducks from "./Components/Ducks.svelte";
import { DUCK_VIEW } from "./constants";
import type BCPlugin from "./main";

export default class DucksView extends ItemView {
  private plugin: BCPlugin;
  private view: Ducks;

  constructor(leaf: WorkspaceLeaf, plugin: BCPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  async onload(): Promise<void> {
    super.onload();
    await this.plugin.saveSettings();
    this.app.workspace.onLayoutReady(async () => {
      await this.draw();
    });
  }

  getViewType() {
    return DUCK_VIEW;
  }
  getDisplayText() {
    return "Breadcrumbs Ducks";
  }

  // TODO Duck icon
  icon = "info";

  async onOpen(): Promise<void> {}

  onClose(): Promise<void> {
    if (this.view) {
      this.view.$destroy();
    }
    return Promise.resolve();
  }

  async draw(): Promise<void> {
    this.contentEl.empty();

    this.view = new Ducks({
      target: this.contentEl,
      props: { plugin: this.plugin, app: this.app, ducksView: this },
    });
  }
}
