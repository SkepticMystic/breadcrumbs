import { App, PluginSettingTab } from "obsidian";
import type BreadcrumbsPlugin from "src/main";
import { _add_settings_dendron_note } from "./DendronNoteSettings";
import { _add_settings_grid_view } from "./GridSettings";
import { _add_settings_hierarchies } from "./HierarchySettings";
import { _add_settings_matrix } from "./MatrixSettings";
import { _add_settings_page_views } from "./PageViewSettings";
import { _add_settings_prev_next_view } from "./PrevNextSettings";

const make_details_el = (
	parent: HTMLElement,
	o?: { d?: DomElementInfo; s?: DomElementInfo },
) =>
	parent.createEl("details", o?.d, (d) =>
		d.createEl("summary", { cls: "text-xl p-1", ...o?.s }),
	);

export class BreadcrumbsSettingTab extends PluginSettingTab {
	plugin: BreadcrumbsPlugin;

	constructor(app: App, plugin: BreadcrumbsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl, plugin } = this;

		containerEl.empty();

		containerEl.addClass("BC-settings-tab");

		// Hierarchies
		_add_settings_hierarchies(
			plugin,
			make_details_el(containerEl, { s: { text: "Hierarchies" } }),
		);

		// Edge Sources
		containerEl.createEl("hr");
		containerEl.createEl("h2", { text: "Edge Sources" });

		_add_settings_dendron_note(
			plugin,
			make_details_el(containerEl, { s: { text: "Dendron Notes" } }),
		);

		// Views
		containerEl.createEl("hr");
		containerEl.createEl("h2", { text: "Views" });

		_add_settings_matrix(
			plugin,
			make_details_el(containerEl, { s: { text: "Matrix" } }),
		);

		/// Page
		const page_details = make_details_el(containerEl, {
			s: { text: "Page" },
		});

		page_details.createEl("h3", { text: "General" });
		_add_settings_page_views(plugin, page_details);

		page_details.createEl("h3", { text: "Grid" });
		_add_settings_grid_view(plugin, page_details);

		page_details.createEl("h3", { text: "Previous/Next" });
		_add_settings_prev_next_view(plugin, page_details);
	}
}
