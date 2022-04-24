// import { ItemView, WorkspaceLeaf } from "obsidian";
// import { STATS_VIEW } from "../constants";
// import type BCPlugin from "../main";
// import Stats from "../Components/Stats.svelte";

// export default class StatsView extends ItemView {
//   private plugin: BCPlugin;
//   private view: Stats;

//   constructor(leaf: WorkspaceLeaf, plugin: BCPlugin) {
//     super(leaf);
//     this.plugin = plugin;
//   }

//   async onload(): Promise<void> {
//     super.onload();
//     this.app.workspace.onLayoutReady(() => {
//       setTimeout(
//         async () => await this.draw(),
//         this.plugin.settings.dvWaitTime
//       );
//     });
//   }

//   getViewType() {
//     return STATS_VIEW;
//   }
//   getDisplayText() {
//     return "Breadcrumbs Stats";
//   }

//   icon = "info";

//   async onOpen(): Promise<void> {
//     await this.plugin.saveSettings();
//   }

//   onClose(): Promise<void> {
//     this.view?.$destroy();
//     return Promise.resolve();
//   }

//   async draw(): Promise<void> {
//     const { contentEl, plugin } = this;
//     contentEl.empty();

//     this.view = new Stats({
//       target: contentEl,
//       props: { plugin },
//     });
//   }
// }
