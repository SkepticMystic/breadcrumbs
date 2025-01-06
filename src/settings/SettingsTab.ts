import { App, Notice, PluginSettingTab } from "obsidian";
import type BreadcrumbsPlugin from "src/main";
import EdgeFieldSettings from "../components/settings/EdgeFieldSettings.svelte";
import TransitiveImpliedRelations from "../components/settings/TransitiveImpliedRelations.svelte";
import { _add_settings_codeblocks } from "./CodeblockSettings";
import { _add_settings_date_note } from "./DateNoteSettings";
import { _add_settings_debug } from "./DebugSettings";
import { _add_settings_dendron_note } from "./DendronNoteSettings";
import { _add_settings_edge_field_suggestor } from "./EdgeFieldSuggestorSettings";
import { _add_settings_freeze_implied_edges } from "./FreezeImpliedEdgesSettings";
import { _add_settings_trail_view } from "./GridSettings";
import { _add_settings_johnny_decimal_note } from "./JohnnyDecimalSettings";
import { _add_settings_list_index } from "./ListIndexSettings";
import { _add_settings_list_note } from "./ListNoteSettings";
import { _add_settings_matrix } from "./MatrixSettings";
import { _add_settings_page_views } from "./PageViewSettings";
import { _add_settings_prev_next_view } from "./PrevNextSettings";
import { _add_settings_rebuild_graph } from "./RebuildGraphSettings";
import { _add_settings_regex_note } from "./RegexNoteSettings";
import { _add_settings_tag_note } from "./TagNoteSettings";
import { _add_settings_thread } from "./ThreadSettings";
import { _add_settings_tree_view } from "./TreeViewSettings";
import { mount, unmount } from "svelte";

const make_details_el = (
	parent: HTMLElement,
	o?: { d?: DomElementInfo; s?: DomElementInfo },
) => {
	let details: HTMLDetailsElement;
	let summary: HTMLElement;
	let children: HTMLDivElement;

	details = parent.createEl("details", {
		cls: "tree-item",
		...o?.d,
	});

	summary = details.createEl("summary", {
		cls: "text-xl p-1 tree-item-self is-clickable",
		...o?.s,
	});

	children = details.createEl("div", { cls: "tree-item-children pl-4" });

	return {
		details,
		summary,
		children,
	};
};

export class BreadcrumbsSettingTab extends PluginSettingTab {
	plugin: BreadcrumbsPlugin;
	components: (ReturnType<typeof EdgeFieldSettings> | ReturnType<typeof TransitiveImpliedRelations>)[] = [];

	constructor(app: App, plugin: BreadcrumbsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl, plugin } = this;

		containerEl.empty();

		containerEl.addClass("BC-settings-tab");

		this.components.push(
			mount(EdgeFieldSettings, {
				props: { plugin },
				target: make_details_el(containerEl, {
					s: { text: "> Edge Fields" },
				}).children,
			}),
		);

		// Implied Relations
		containerEl.createEl("hr");
		containerEl.createEl("h3", { text: "Implied Relations" });

		this.components.push(
			mount(TransitiveImpliedRelations, {
				props: { plugin },
				target: make_details_el(containerEl, {
					s: { text: "> Transitive" },
				}).children,
			}),
		);

		// Edge Sources
		containerEl.createEl("hr");
		containerEl.createEl("h3", { text: "Edge Sources" });

		_add_settings_tag_note(
			plugin,
			make_details_el(containerEl, { s: { text: "> Tag Notes" } })
				.children,
		);

		_add_settings_list_note(
			plugin,
			make_details_el(containerEl, { s: { text: "> List Notes" } })
				.children,
		);

		_add_settings_date_note(
			plugin,
			make_details_el(containerEl, { s: { text: "> Date Notes" } })
				.children,
		);

		_add_settings_regex_note(
			plugin,
			make_details_el(containerEl, { s: { text: "> Regex Notes" } })
				.children,
		);

		_add_settings_dendron_note(
			plugin,
			make_details_el(containerEl, { s: { text: "> Dendron Notes" } })
				.children,
		);

		_add_settings_johnny_decimal_note(
			plugin,
			make_details_el(containerEl, {
				s: { text: "> Johnny Decimal Notes" },
			}).children,
		);

		// Views
		containerEl.createEl("hr");
		containerEl.createEl("h3", { text: "Views" });

		_add_settings_matrix(
			plugin,
			make_details_el(containerEl, { s: { text: "> Matrix" } }).children,
		);

		/// Page
		const page_details = make_details_el(containerEl, {
			s: { text: "> Page" },
		}).children;

		page_details.createEl("h5", { text: "General" });
		_add_settings_page_views(plugin, page_details);

		page_details.createEl("h5", { text: "Trail" });
		_add_settings_trail_view(plugin, page_details);

		page_details.createEl("h5", { text: "Previous/Next" });
		_add_settings_prev_next_view(plugin, page_details);

		_add_settings_tree_view(
			plugin,
			make_details_el(containerEl, { s: { text: "> Tree" } }).children,
		);

		_add_settings_codeblocks(
			plugin,
			make_details_el(containerEl, { s: { text: "> Codeblocks" } })
				.children,
		);

		// Commands
		containerEl.createEl("hr");
		containerEl.createEl("h3", { text: "Commands" });

		_add_settings_rebuild_graph(
			plugin,
			make_details_el(containerEl, { s: { text: "> Rebuild Graph" } })
				.children,
		);

		_add_settings_list_index(
			plugin,
			make_details_el(containerEl, { s: { text: "> List Index" } })
				.children,
		);

		_add_settings_freeze_implied_edges(
			plugin,
			make_details_el(containerEl, {
				s: { text: "> Freeze Implied Edges" },
			}).children,
		);

		_add_settings_thread(
			plugin,
			make_details_el(containerEl, { s: { text: "> Thread" } }).children,
		);

		// Suggestors
		containerEl.createEl("hr");
		containerEl.createEl("h3", { text: "Suggestors" });

		_add_settings_edge_field_suggestor(
			plugin,
			make_details_el(containerEl, {
				s: { text: "> Edge Field Suggestor" },
			}).children,
		);

		// Debugging
		containerEl.createEl("hr");

		_add_settings_debug(
			plugin,
			make_details_el(containerEl, { s: { text: "> Debug" } }).children,
		);
	}

	hide() {
		if (this.plugin.settings.is_dirty) {
			new Notice(
				"⚠️ Exited without saving settings. Your changes are still in effect, but were not saved. Go back and click 'Save' if you want them to persist. Otherwise, reload Obsidian to revert to the last saved settings.",
			);
		}

		this.components.forEach((c) => unmount(c));
	}
}
