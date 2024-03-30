import { ItemView, WorkspaceLeaf } from "obsidian";
import TreeViewComponent from "src/components/TreeView.svelte";
import { VIEW_IDS } from "src/const/views";
import BreadcrumbsPlugin from "src/main";

export class TreeView extends ItemView {
	plugin: BreadcrumbsPlugin;
	component!: TreeViewComponent;

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

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();

		this.component = new TreeViewComponent({
			target: this.contentEl,
			props: { plugin: this.plugin },
		});
	}

	async onClose() {
		this.component?.$destroy();
	}
}
