import BreadcrumbsPlugin from "src/main";
import { ItemView, WorkspaceLeaf } from "obsidian";
import MatrixComponent from "src/components/side_views/Matrix.svelte";
import { VIEW_IDS } from "src/const/views";

export class MatrixView extends ItemView {
	plugin: BreadcrumbsPlugin;
	component!: MatrixComponent;

	constructor(leaf: WorkspaceLeaf, plugin: BreadcrumbsPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return VIEW_IDS.matrix;
	}

	getDisplayText() {
		return "Matrix view";
	}

	icon = "blinds";

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();

		this.component = new MatrixComponent({
			target: this.contentEl,
			props: { plugin: this.plugin },
		});
	}

	async onClose() {
		this.component?.$destroy();
	}
}
