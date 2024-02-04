import { App, MarkdownRenderer, Modal, Setting } from "obsidian";
import type BreadcrumbsPlugin from "src/main";
import { new_setting } from "src/utils/settings";

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

			MarkdownRenderer.render(this.app, code, contentEl, "", plugin);
		};

		const save = async () => {
			await Promise.all([plugin.saveSettings(), plugin.refresh()]);
		};

		new_setting(contentEl, {
			name: "Current Note is Sibling",
			desc: "The current note is it's own implied sibling.",
			toggle: {
				value: implied_relationships.self_is_sibling,
				cb: async (val) => {
					implied_relationships.self_is_sibling = val;
					await save();
				},
			},
		});

		render_mermaid_diagram(
			`flowchart LR
      Me -.->|same| Me`,
		);

		new_setting(contentEl, {
			name: "Opposite Direction",
			desc: "An explicit relationship in one direction implies the opposite direction.",
			toggle: {
				value: implied_relationships.opposite_direction,
				cb: async (val) => {
					implied_relationships.opposite_direction = val;
					await save();
				},
			},
		});

		render_mermaid_diagram(
			`flowchart LR
      A -->|up| B
      B -.->|down| A`,
		);

		new_setting(contentEl, {
			name: "Same Parent -> Siblings",
			desc: "If two notes share a parent, they are siblings.",
			toggle: {
				value: implied_relationships.same_parent_is_sibling,
				cb: async (val) => {
					implied_relationships.same_parent_is_sibling = val;
					await save();
				},
			},
		});

		render_mermaid_diagram(
			`flowchart LR
      Me -->|up| Dad
      Sister -->|up| Dad
      Me <-.->|same| Sister`,
		);

		new_setting(contentEl, {
			name: "Same Siblings -> Siblings",
			desc: "Treat your siblings' siblings as your siblings",
			toggle: {
				value: implied_relationships.same_sibling_is_sibling,
				cb: async (val) => {
					implied_relationships.same_sibling_is_sibling = val;
					await save();
				},
			},
		});

		render_mermaid_diagram(
			`flowchart LR
      Me -->|same| Sister
      Me -->|same| Brother
      Sister <-.->|same| Brother`,
		);

		new_setting(contentEl, {
			name: "Siblings' Parent -> Parent",
			desc: "Your siblings' parents are your parents",
			toggle: {
				value: implied_relationships.siblings_parent_is_parent,
				cb: async (val) => {
					implied_relationships.siblings_parent_is_parent = val;
					await save();
				},
			},
		});

		render_mermaid_diagram(
			`flowchart LR
      Sister -->|up| Dad
      Sister <-->|same| Me
      Me -.->|up| Dad`,
		);

		new_setting(contentEl, {
			name: "Aunt/Uncle",
			desc: "Your parent's siblings are your parents (aunts/uncles)",
			toggle: {
				value: implied_relationships.parents_sibling_is_parent,
				cb: async (val) => {
					implied_relationships.parents_sibling_is_parent = val;
					await save();
				},
			},
		});

		render_mermaid_diagram(
			`flowchart LR
      Me -->|up| Dad
      Dad -->|same| Uncle
      Me -.->|up| Uncle`,
		);

		new_setting(contentEl, {
			name: "Cousins",
			desc: "Parents' siblings' children are siblings (cousins)",
			toggle: {
				value: implied_relationships.cousin_is_sibling,
				cb: async (val) => {
					implied_relationships.cousin_is_sibling = val;
					await save();
				},
			},
		});

		render_mermaid_diagram(
			`flowchart LR
      Me -->|up| Dad
      Dad -->|same| Uncle
      Uncle -->|down| Cousin
      Me <-.->|same| Cousin`,
		);

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText("Save & Close")
				.setCta()
				.onClick(() => {
					this.close();
				}),
		);
	}

	onClose() {
		this.contentEl.empty();
	}
}
