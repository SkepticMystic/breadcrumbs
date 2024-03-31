import { App, Modal, Notice, Setting, TFile } from "obsidian";
import { ListIndex } from "src/commands/list_index";
import EdgeSortIdSettingItem from "src/components/settings/EdgeSortIdSettingItem.svelte";
import { DIRECTIONS } from "src/const/hierarchies";
import { LINK_KINDS } from "src/const/links";
import type BreadcrumbsPlugin from "src/main";
import { _add_settings_show_node_options } from "src/settings/ShowNodeOptions";
import { active_file_store } from "src/stores/active_file";
import { stringify_hierarchy } from "src/utils/hierarchies";
import { new_setting } from "src/utils/settings";
import { get } from "svelte/store";

export class CreateListIndexModal extends Modal {
	plugin: BreadcrumbsPlugin;
	active_file: TFile | null = get(active_file_store);
	options: ListIndex.Options;

	constructor(app: App, plugin: BreadcrumbsPlugin) {
		super(app);

		this.plugin = plugin;
		this.options = plugin.settings.commands.list_index.default_options;
	}

	onOpen() {
		// TODO: Rather don't show the command at all
		if (!this.active_file) {
			new Notice("No active file");
			return this.close();
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

		new_setting(contentEl, {
			name: "Direction",
			desc: "Direction to traverse",
			select: {
				options: DIRECTIONS,
				value: this.options.dir,
				cb: (value) => (this.options.dir = value),
			},
		});

		new_setting(contentEl, {
			name: "Link Kind",
			desc: "Format to use for links",
			select: {
				options: LINK_KINDS,
				value: this.options.link_kind,
				cb: (value) => (this.options.link_kind = value),
			},
		});

		new_setting(contentEl, {
			name: "Indent",
			desc: "Indentation to use for each level",
			input: {
				value: this.options.indent,
				cb: (value) => (this.options.indent = value),
			},
		});

		new EdgeSortIdSettingItem({
			target: contentEl,
			props: { edge_sort_id: this.options.edge_sort_id },
		}).$on("select", (e) => {
			this.options.edge_sort_id = e.detail;
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
					plugin.log.debug("build_list_index options", this.options);

					const list_index = ListIndex.build(
						plugin.graph,
						this.active_file!.path,
						this.options,
					);

					if (list_index) {
						await navigator.clipboard.writeText(list_index);

						new Notice("List index copied to clipboard");
					} else {
						new Notice("No list items to copy");
					}

					this.close();
				}),
		);
	}

	onClose() {
		this.contentEl.empty();
	}
}
