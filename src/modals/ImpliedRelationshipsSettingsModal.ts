import { App, MarkdownRenderer, Modal, Setting } from "obsidian";
import { IMPLIED_RELATIONSHIP_MAX_ROUNDS } from "src/const/settings";
import type BreadcrumbsPlugin from "src/main";
import { Mermaid } from "src/utils/mermaid";
import { new_setting } from "src/utils/settings";

const ROUNDS = Array.from(
	// +1 to include 0 rounds
	{ length: IMPLIED_RELATIONSHIP_MAX_ROUNDS + 1 },
	(_, i) => String(i),
);

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
			text: `Here you can change which implied relationships get added to the Breadcrumbs graph.
For each relationship, choose the number of _rounds_ to run. Zero (0) rounds disables the relation. One (1) round runs it once, only considering real relations added before. Two (2) rounds runs it twice, considering real relations and implied relations added in the first round. And so on.`,
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
			select: {
				options: ROUNDS,
				value: String(implied_relationships.self_is_sibling.rounds),
				cb: async (val) => {
					implied_relationships.self_is_sibling.rounds = Number(val);
					await save();
				},
			},
		});

		render_mermaid_diagram(
			Mermaid.from_edges([
				{
					source_id: "Me",
					target_id: "Me",
					attr: { explicit: false, field: "same" },
				},
			]),
		);

		new_setting(contentEl, {
			name: "Opposite Direction",
			desc: "An explicit relationship in one direction implies the opposite direction.",
			select: {
				options: ROUNDS,
				value: String(implied_relationships.opposite_direction.rounds),
				cb: async (val) => {
					implied_relationships.opposite_direction.rounds =
						Number(val);
					await save();
				},
			},
		});

		render_mermaid_diagram(
			Mermaid.from_edges(
				[
					{
						source_id: "A",
						target_id: "B",
						attr: { explicit: true, field: "up" },
					},
					{
						source_id: "B",
						target_id: "A",
						attr: { explicit: false, field: "down" },
					},
				],
				{ direction: "LR" },
			),
		);

		new_setting(contentEl, {
			name: "Parent's Child -> Sibling",
			desc: "Your parent's children are your siblings",
			select: {
				options: ROUNDS,
				value: String(
					implied_relationships.same_parent_is_sibling.rounds,
				),
				cb: async (val) => {
					implied_relationships.same_parent_is_sibling.rounds =
						Number(val);
					await save();
				},
			},
		});

		render_mermaid_diagram(
			Mermaid.from_edges([
				{
					source_id: "Me",
					target_id: "Dad",
					attr: { explicit: true, field: "up" },
				},
				{
					source_id: "Dad",
					target_id: "Sister",
					attr: { explicit: true, field: "down" },
				},
				{
					source_id: "Me",
					target_id: "Sister",
					attr: { explicit: false, field: "same" },
				},
			]),
		);

		new_setting(contentEl, {
			name: "Same Siblings -> Siblings",
			desc: "Treat your siblings' siblings as your siblings",
			select: {
				options: ROUNDS,
				value: String(
					implied_relationships.same_sibling_is_sibling.rounds,
				),
				cb: async (val) => {
					implied_relationships.same_sibling_is_sibling.rounds =
						Number(val);
					await save();
				},
			},
		});

		render_mermaid_diagram(
			Mermaid.from_edges([
				{
					source_id: "Me",
					target_id: "Sister",
					attr: { explicit: true, field: "same" },
				},
				{
					source_id: "Sister",
					target_id: "Brother",
					attr: { explicit: true, field: "same" },
				},
				{
					source_id: "Me",
					target_id: "Brother",
					attr: { explicit: false, field: "same" },
				},
			]),
		);

		new_setting(contentEl, {
			name: "Siblings' Parent -> Parent",
			desc: "Your siblings' parents are your parents",
			select: {
				options: ROUNDS,
				value: String(
					implied_relationships.siblings_parent_is_parent.rounds,
				),
				cb: async (val) => {
					implied_relationships.siblings_parent_is_parent.rounds =
						Number(val);
					await save();
				},
			},
		});

		render_mermaid_diagram(
			Mermaid.from_edges([
				{
					source_id: "Me",
					target_id: "Sister",
					attr: { explicit: true, field: "same" },
				},
				{
					source_id: "Sister",
					target_id: "Dad",
					attr: { explicit: true, field: "up" },
				},
				{
					source_id: "Me",
					target_id: "Dad",
					attr: { explicit: false, field: "up" },
				},
			]),
		);

		new_setting(contentEl, {
			name: "Aunt/Uncle",
			desc: "Your parent's siblings are your parents (aunts/uncles)",
			select: {
				options: ROUNDS,
				value: String(
					implied_relationships.parents_sibling_is_parent.rounds,
				),
				cb: async (val) => {
					implied_relationships.parents_sibling_is_parent.rounds =
						Number(val);
					await save();
				},
			},
		});

		render_mermaid_diagram(
			Mermaid.from_edges([
				{
					source_id: "Me",
					target_id: "Dad",
					attr: { explicit: true, field: "up" },
				},
				{
					source_id: "Dad",
					target_id: "Uncle",
					attr: { explicit: true, field: "same" },
				},
				{
					source_id: "Me",
					target_id: "Uncle",
					attr: { explicit: false, field: "up" },
				},
			]),
		);

		new_setting(contentEl, {
			name: "Cousins",
			desc: "Parents' siblings' children are siblings (cousins)",
			select: {
				options: ROUNDS,
				value: String(implied_relationships.cousin_is_sibling.rounds),
				cb: async (val) => {
					implied_relationships.cousin_is_sibling.rounds =
						Number(val);
					await save();
				},
			},
		});

		render_mermaid_diagram(
			Mermaid.from_edges([
				{
					source_id: "Me",
					target_id: "Dad",
					attr: { explicit: true, field: "up" },
				},
				{
					source_id: "Dad",
					target_id: "Uncle",
					attr: { explicit: true, field: "same" },
				},
				{
					source_id: "Uncle",
					target_id: "Cousin",
					attr: { explicit: true, field: "down" },
				},
				{
					source_id: "Me",
					target_id: "Cousin",
					attr: { explicit: false, field: "same" },
				},
			]),
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
