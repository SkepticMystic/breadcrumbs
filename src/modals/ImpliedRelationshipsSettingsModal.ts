import { App, MarkdownRenderer, Modal, Setting } from "obsidian";
import { rebuild_graph } from "src/graph/build";
import type BreadcrumbsPlugin from "src/main";
import { active_file_store } from "src/stores/active_file";

export class ImpliedRelationshipsSettingsModal extends Modal {
	plugin: BreadcrumbsPlugin;
	hierarchy_i: number;

	constructor(app: App, plugin: BreadcrumbsPlugin, hierarchy_i: number) {
		super(app);
		this.plugin = plugin;
		this.hierarchy_i = hierarchy_i;
	}

	onOpen() {
		const { contentEl, hierarchy_i, plugin } = this;
		const { settings } = plugin;
		const { implied_relationships } = settings.hierarchies[hierarchy_i];

		contentEl.createEl("h2", {
			text:
				"Implied Relationships Settings for Hierarchy " +
				(hierarchy_i + 1),
		});

		contentEl.createEl("p", {
			text: `Here you can toggle on/off different types of implied relationships. 
      All of your explicit (real) relationships will still show, but you can choose which implied ones get filled in.`,
		});

		const render_mermaid_diagram = (diagram_string: string) => {
			const code = "```mermaid\n" + diagram_string + "\n```";
			console.log("rendering mermaid diagram", code);

			MarkdownRenderer.render(this.app, code, contentEl, "", plugin);
		};

		const save = async () => {
			await plugin.saveSettings();

			plugin.graph = rebuild_graph(plugin);
			active_file_store.refresh(this.app);
		};

		new Setting(contentEl)
			.setName("Current Note is Sibling")
			.setDesc("The current note is it's own implied sibling.")
			.addToggle((tg) =>
				tg
					.setValue(implied_relationships.self_is_sibling)
					.onChange(async (val) => {
						implied_relationships.self_is_sibling = val;

						await save();
					})
			);

		render_mermaid_diagram(
			`flowchart LR
      Me -.->|same| Me`
		);

		new Setting(contentEl)
			.setName("Opposite Direction")
			.setDesc(
				"An explicit relationship in one direction implies the opposite direction."
			)
			.addToggle((tg) =>
				tg
					.setValue(implied_relationships.opposite_direction)
					.onChange(async (val) => {
						implied_relationships.opposite_direction = val;

						await save();
					})
			);

		render_mermaid_diagram(
			`flowchart LR
      A -->|up| B
      B -.->|down| A`
		);

		new Setting(contentEl)
			.setName("Same Parent -> Siblings")
			.setDesc("If two notes share a parent, they are siblings.")
			.addToggle((tg) =>
				tg
					.setValue(implied_relationships.same_parent_is_sibling)
					.onChange(async (val) => {
						implied_relationships.same_parent_is_sibling = val;

						await save();
					})
			);

		render_mermaid_diagram(
			`flowchart LR
      Me -->|up| Dad
      Sister -->|up| Dad
      Me <-.->|same| Sister`
		);

		new Setting(contentEl)
			.setName("Same Siblings -> Siblings")
			.setDesc("Treat your siblings' siblings as your siblings")
			.addToggle((tg) =>
				tg
					.setValue(implied_relationships.same_sibling_is_sibling)
					.onChange(async (val) => {
						implied_relationships.same_sibling_is_sibling = val;

						await save();
					})
			);

		render_mermaid_diagram(
			`flowchart LR
      Me -->|same| Sister
      Me -->|same| Brother
      Sister <-.->|same| Brother`
		);

		new Setting(contentEl)
			.setName("Siblings' Parent -> Parent")
			.setDesc("Your siblings' parents are your parents")
			.addToggle((tg) =>
				tg
					.setValue(implied_relationships.siblings_parent_is_parent)
					.onChange(async (val) => {
						implied_relationships.siblings_parent_is_parent = val;

						await save();
					})
			);

		render_mermaid_diagram(
			`flowchart LR
      Sister -->|up| Dad
      Sister <-->|same| Me
      Me -.->|up| Dad`
		);

		new Setting(contentEl)
			.setName("Aunt/Uncle")
			.setDesc("Your parent's siblings are your parents (aunts/uncles)")
			.addToggle((tg) =>
				tg
					.setValue(implied_relationships.parents_sibling_is_parent)
					.onChange(async (val) => {
						implied_relationships.parents_sibling_is_parent = val;

						await save();
					})
			);

		render_mermaid_diagram(
			`flowchart LR
      Me -->|up| Dad
      Dad -->|same| Uncle
      Me -.->|up| Uncle`
		);

		new Setting(contentEl)
			.setName("Cousins")
			.setDesc("Parents' siblings' children are siblings (cousins)")
			.addToggle((tg) =>
				tg
					.setValue(implied_relationships.cousing_is_sibling)
					.onChange(async (val) => {
						implied_relationships.cousing_is_sibling = val;

						await save();
					})
			);

		render_mermaid_diagram(
			`flowchart LR
      Me -->|up| Dad
      Dad -->|same| Uncle
      Uncle -->|down| Cousin
      Me <-.->|same| Cousin`
		);

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText("Save & Close")
				.setCta()
				.onClick(() => {
					this.close();
				})
		);
	}

	onClose() {
		this.contentEl.empty();
	}
}
