import type { WorkspaceLeaf } from "obsidian";
import { ItemView } from "obsidian";
import TreeViewComponent from "src/components/side_views/TreeView.svelte";
import { VIEW_IDS } from "src/const/views";
import type BreadcrumbsPlugin from "src/main";
import { BCEvent } from "src/main";
import { mount, unmount } from "svelte";

export class TreeView extends ItemView {
	plugin: BreadcrumbsPlugin;
	component!: ReturnType<typeof TreeViewComponent>;

	constructor(leaf: WorkspaceLeaf, plugin: BreadcrumbsPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return VIEW_IDS.tree;
	}

	getDisplayText() {
		return "Tree view";
	}

	icon = "tree-pine";

	onload(): void {
		this.registerEvent(
			this.plugin.events.on(BCEvent.REDRAW_SIDE_VIEWS, () => {
				void this.onOpen();
			}),
		);
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();

		this.component = mount(TreeViewComponent, {
			target: this.contentEl,
			props: { plugin: this.plugin },
		});
	}

	async onClose() {
		if (this.component) {
			await unmount(this.component);
		}
	}
}
