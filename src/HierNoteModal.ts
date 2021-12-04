import { App, FuzzyMatch, FuzzySuggestModal, Notice } from "obsidian";
import { HierarchyNoteManipulator } from "./HierarchyNoteManipulator";
import type { BCSettings } from "./interfaces";
import type BCPlugin from "./main";

export class HierarchyNoteSelectorModal extends FuzzySuggestModal<string> {
  app: App;
  plugin: BCPlugin;
  settings: BCSettings;

  constructor(app: App, plugin: BCPlugin) {
    super(app);
    this.app = app;
    this.plugin = plugin;
    this.settings = this.plugin.settings;
  }

  onOpen(): void {
    this.setPlaceholder("HN Chooser");
    const { hierarchyNotes } = this.settings;
    if (hierarchyNotes.length === 0) {
      this.close();
      new Notice("No hierarchy notes found");
    } else if (hierarchyNotes.length === 1) {
      this.close();
      new HierarchyNoteManipulator(
        this.app,
        this.plugin,
        hierarchyNotes[0]
      ).open();
    } else {
      super.onOpen();
    }
  }

  getItems(): string[] {
    return this.settings.hierarchyNotes;
  }

  getItemText(item: string): string {
    return `${item}`;
  }

  renderSuggestion(item: FuzzyMatch<string>, el: HTMLElement) {
    super.renderSuggestion(item, el);
  }

  onChooseItem(item: string, evt: MouseEvent | KeyboardEvent): void {
    new HierarchyNoteManipulator(this.app, this.plugin, item).open();
    this.close();
  }
}
