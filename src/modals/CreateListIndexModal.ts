import { App, Modal, Notice, Setting, TFile } from "obsidian";
import { DIRECTIONS, type Direction } from "src/const/hierarchies";
import { LINK_KINDS } from "src/const/links";
import { Traverse } from "src/graph/traverse";
import type { LinkKind } from "src/interfaces/links";
import type { ShowNodeOptions } from "src/interfaces/settings";
import type BreadcrumbsPlugin from "src/main";
import { _add_settings_show_node_options } from "src/settings/ShowNodeOptions";
import { active_file_store } from "src/stores/active_file";
import { stringify_hierarchy } from "src/utils/hierarchies";
import { get } from "svelte/store";

export class CreateListIndexModal extends Modal {
	plugin: BreadcrumbsPlugin;
	active_file: TFile | null = get(active_file_store);
	options: {
		indent: string;
		dir: Direction;
		link_kind: LinkKind;
		// -1 means all (no filter)
		hierarchy_i: number;
		show_node_options: ShowNodeOptions;
	} = {
		dir: "down",
		indent: "\\t",
		hierarchy_i: -1,
		link_kind: "wiki",
		show_node_options: {
			ext: false,
			alias: true,
			folder: false,
		},
	};

	constructor(app: App, plugin: BreadcrumbsPlugin) {
		super(app);

		this.plugin = plugin;
	}

	onOpen() {
		// TODO: Rather don't show the command at all
		if (!this.active_file) {
			new Notice("No active file");
			this.close();
			return;
		}

		const { contentEl, plugin } = this;
		const { settings } = plugin;

		contentEl.createEl("h2", {
			text: "Create List Index",
		});

		new Setting(contentEl)
			.setName("Hierarchy")
			.setDesc(
				"Optionally constrain the traversal to a specific hierarchy",
			)
			.addDropdown((dropdown) => {
				dropdown.addOption("-1", "All");

				settings.hierarchies.forEach((hierarchy, i) => {
					dropdown.addOption(
						String(i),
						stringify_hierarchy(hierarchy),
					);
				});

				dropdown.setValue(String(this.options.hierarchy_i));

				dropdown.onChange((value) => {
					this.options.hierarchy_i = Number(value);
				});
			});

		new Setting(contentEl)
			.setName("Direction")
			.setDesc("Direction to traverse")
			.addDropdown((dropdown) => {
				DIRECTIONS.forEach((dir) => {
					dropdown.addOption(dir, dir);
				});

				dropdown.setValue(this.options.dir);

				dropdown.onChange((value) => {
					this.options.dir = value as Direction;
				});
			});

		new Setting(contentEl)
			.setName("Link Kind")
			.setDesc("Format to use for links")
			.addDropdown((dropdown) => {
				LINK_KINDS.forEach((kind) => {
					dropdown.addOption(kind, kind);
				});

				dropdown.setValue(this.options.link_kind);

				dropdown.onChange((value) => {
					this.options.link_kind = value as LinkKind;
				});
			});

		new Setting(contentEl)
			.setName("Indent")
			.setDesc("Indentation to use for each level")
			.addText((text) => {
				text.setValue(this.options.indent).onChange((value) => {
					this.options.indent = value;
				});
			});

		_add_settings_show_node_options(
			plugin,
			contentEl,
			{
				get: () => this.options.show_node_options,
				set: (value) => (this.options.show_node_options = value),
			},
			{ save_and_refresh: false },
		);

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText("Build & Copy to Clipboard")
				.setCta()
				.onClick(async () => {
					console.log("build_list_index", this.options);
					const list_index = this.build_list_index();
					console.log("list_index\n", list_index);
					await navigator.clipboard.writeText(list_index);

					new Notice("List index copied to clipboard");

					this.close();
				}),
		);
	}

	build_list_index = () =>
		Traverse.paths_to_index_list(
			Traverse.all_paths(
				"depth_first",
				this.plugin.graph,
				this.active_file!.path,
				(e) =>
					e.attr.dir === this.options.dir &&
					(this.options.hierarchy_i === -1 ||
						e.attr.hierarchy_i === this.options.hierarchy_i),
			),
			this.options,
		);

	onClose() {
		this.contentEl.empty();
	}
}
