import { App, FuzzyMatch, FuzzySuggestModal, Notice } from "obsidian";
import { HierarchyNoteManipulator } from "./HierarchyNoteManipulator";
import type { BCSettings } from "../../interfaces";
import type BCPlugin from "../../main";

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
    } else if (hierarchyNotes.length === 1 && ! hierarchyNotes[0].endsWith("/")) {
      this.close();
      new HierarchyNoteManipulator(
        this.app,
        this.plugin,
        hierarchyNotes[0]
      ).open(); 
    } else   {
      super.onOpen();
    }
  }

  getItems(): string[] {
    let setting = this.settings.hierarchyNotes 
    if( setting.length == 1 &&  setting[0].endsWith("/")) { 
      // this is a folder
      let folder = setting[0].slice(0,-1)
      if( this.plugin.app.plugins.plugins.dataview != undefined) { 
        let pages = this.plugin.app.plugins.plugins.dataview.api.pages(`"${folder}"`)
        return pages.values.map(page=> page.file.path)
      } else {
        new Notice("make sure you have dataview enabled")
      }
    }else return setting 
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
