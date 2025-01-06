import BreadcrumbsPlugin, { BCEvent } from "src/main";
import { ItemView, WorkspaceLeaf } from "obsidian";
import MatrixComponent from "src/components/side_views/Matrix.svelte";
import { VIEW_IDS } from "src/const/views";
import { mount, unmount } from "svelte";

export class MatrixView extends ItemView {
	plugin: BreadcrumbsPlugin;
	component!: ReturnType<typeof MatrixComponent>;

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

		onload(): void {
			this.registerEvent(
				this.plugin.events.on(BCEvent.REDRAW_SIDE_VIEWS, () => {
					this.onOpen();
				})
			);
		}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();

		this.component = mount(MatrixComponent, {
        			target: this.contentEl,
        			props: { plugin: this.plugin },
        		});
	}

	async onClose() {
		if (this.component) {
			unmount(this.component);
		}
	}
}
