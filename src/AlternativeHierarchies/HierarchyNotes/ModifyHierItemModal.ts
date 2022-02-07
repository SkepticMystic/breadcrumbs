import { App, Modal, TFile } from "obsidian";
import ModifyHNItemComp from "../../Components/ModifyHNItemComp.svelte";
import type BCPlugin from "../../main";

interface HNItem {
  depth: number;
  line: string;
  lineNo: number;
}

export class ModifyHierItemModal extends Modal {

  mount : ModifyHNItemComp ; 
  plugin: BCPlugin;
  modal: ModifyHierItemModal;
  hnItem: HNItem;
  file: TFile;
  rel: "up" | "same" | "down";

  constructor(
    app: App,
    plugin: BCPlugin,
    hnItem: HNItem,
    file: TFile,
    rel: "up" | "same" | "down"
  ) {
    super(app);
    this.plugin = plugin;
    this.modal = this;
    this.hnItem = hnItem;
    this.file = file;
    this.rel = rel;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    this.mount  = new ModifyHNItemComp({
      target: contentEl,
      props: {
        modal: this,
        settings: this.plugin.settings,
        hnItem: this.hnItem,
        file: this.file,
        rel: this.rel,
      },
    });
  }

  onClose() {
    this.mount.$destroy() 
    this.contentEl.empty();
  }
}
