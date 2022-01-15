import { error } from "loglevel";
import {
  App,
  FuzzyMatch,
  FuzzySuggestModal,
  ListItemCache,
  MarkdownView,
  Notice,
  TFile,
} from "obsidian";
import { ModifyHierItemModal } from "./ModifyHierItemModal";
import type { BCSettings } from "../interfaces";
import type BCPlugin from "../main";
import { dropWikilinks } from "../sharedFunctions";

interface HNItem {
  depth: number;
  line: string;
  lineNo: number;
}

export class HierarchyNoteManipulator extends FuzzySuggestModal<HNItem> {
  app: App;
  plugin: BCPlugin;
  settings: BCSettings;
  hierNoteName: string;
  lines: string[];
  listItems: ListItemCache[];
  file: TFile;

  constructor(app: App, plugin: BCPlugin, hierNoteName: string) {
    super(app);
    this.app = app;
    this.plugin = plugin;
    this.settings = this.plugin.settings;
    this.hierNoteName = hierNoteName;

    const chooseOverride = (evt: KeyboardEvent) => {
      // @ts-ignore
      this.chooser.useSelectedItem(evt);
      return false;
    };
    this.scope.register([], "Delete", chooseOverride);
    this.scope.register(["Shift"], "ArrowUp", chooseOverride);
    this.scope.register(["Shift"], "ArrowRight", chooseOverride);
    this.scope.register(["Shift"], "ArrowDown", chooseOverride);
  }

  async onOpen(): Promise<void> {
    this.setPlaceholder("HN Manipulator");
    this.setInstructions([
      { command: "Enter/Click", purpose: "Jump to item" },
      { command: "Shift + ↑", purpose: "Add parent" },
      { command: "Shift + →", purpose: "Add sibling" },
      { command: "Shift + ↓", purpose: "Add child" },
      { command: "Delete", purpose: "Delete item" },
    ]);

    this.file = this.app.metadataCache.getFirstLinkpathDest(
      this.hierNoteName,
      ""
    );
    if (!this.file) this.lines = [];
    const content = await this.app.vault.cachedRead(this.file);
    this.lines = content.split("\n");

    this.listItems = this.app.metadataCache.getFileCache(this.file).listItems;

    super.onOpen();
  }

  getItems(): HNItem[] {
    const items = this.listItems
      .map((item) => {
        const i = item.position.start.line;
        return { i, line: this.lines[i] };
      })
      .map((item) => {
        const splits = item.line.split("- ");
        const depth = splits[0].length;
        const line = splits.slice(1).join("- ");

        return { depth, line, lineNo: item.i };
      });

    return items;
  }

  getItemText(item: HNItem): string {
    return `${" ".repeat(item.depth)}- ${dropWikilinks(item.line)}`;
  }

  renderSuggestion(item: FuzzyMatch<HNItem>, el: HTMLElement) {
    super.renderSuggestion(item, el);
    el.innerText = `${" ".repeat(item.item.depth)}- ${dropWikilinks(
      item.item.line
    )}`;
  }

  async deleteItem(item: HNItem): Promise<void> {
    try {
      this.lines.splice(item.lineNo, 1);
      this.listItems.splice(item.lineNo, 1);
      await this.app.vault.modify(this.file, this.lines.join("\n"));
      new Notice("Item deleted Succesfully");
    } catch (err) {
      error(err);
      new Notice("An error occured. Please check the console");
    }
  }

  onChooseItem(item: HNItem, evt: MouseEvent | KeyboardEvent): void {
    if (evt instanceof KeyboardEvent && evt.key === "Delete") {
      this.deleteItem(item);
    } else if (evt instanceof KeyboardEvent && evt.shiftKey) {
      const rel =
        evt.key === "ArrowUp"
          ? "up"
          : evt.key === "ArrowDown"
          ? "down"
          : "same";

      new ModifyHierItemModal(
        this.app,
        this.plugin,
        item,
        this.file,
        rel
      ).open();
      this.close();
    } else {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      const { editor } = view ?? {};
      if (!editor) return;
      //@ts-ignore
      view.leaf.openFile(this.file, { active: true, mode: "source" });
      editor.setCursor({ line: item.lineNo, ch: item.depth + 2 });
    }
  }
}
