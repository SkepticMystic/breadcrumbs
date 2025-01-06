import { App, Modal, Notice, Setting, TFile } from "obsidian";
import { ListIndex } from "src/commands/list_index";
import EdgeSortIdSettingItem from "src/components/settings/EdgeSortIdSettingItem.svelte";
import FieldGroupLabelsSettingItem from "src/components/settings/FieldGroupLabelsSettingItem.svelte";
import ShowAttributesSettingItem from "src/components/settings/ShowAttributesSettingItem.svelte";
import { LINK_KINDS } from "src/const/links";
import { log } from "src/logger";
import type BreadcrumbsPlugin from "src/main";
import { _add_settings_show_node_options } from "src/settings/ShowNodeOptions";
import { active_file_store } from "src/stores/active_file";
import { resolve_field_group_labels } from "src/utils/edge_fields";
import { new_setting } from "src/utils/settings";
import { get } from "svelte/store";
import { mount } from "svelte";

export class CreateListIndexModal extends Modal {
	plugin: BreadcrumbsPlugin;
	options: ListIndex.Options;
	active_file: TFile | null = get(active_file_store);

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

		contentEl.createEl("h2", {
			text: "Create List Index",
		});

		mount(FieldGroupLabelsSettingItem, {
        			target: contentEl,
        			props: {
        				field_group_labels: this.options.field_group_labels,
        				edge_field_groups: plugin.settings.edge_field_groups,
        			},
        		}).$on("select", (e) => {
			// Tracking groups for the UI
			this.options.field_group_labels = e.detail;

			// Settings fields for the build call
			this.options.fields = resolve_field_group_labels(
				plugin.settings.edge_field_groups,
				this.options.field_group_labels,
			);
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

		mount(EdgeSortIdSettingItem, {
        			target: contentEl,
        			props: { edge_sort_id: this.options.edge_sort_id },
        		}).$on("select", (e) => {
			this.options.edge_sort_id = e.detail;
		});

		mount(ShowAttributesSettingItem, {
        			target: contentEl,
        			props: { show_attributes: this.options.show_attributes },
        		}).$on("select", (e) => {
			this.options.show_attributes = e.detail;
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
					log.debug("build_list_index options", this.options);

					const list_index = ListIndex.build(
						plugin,
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
