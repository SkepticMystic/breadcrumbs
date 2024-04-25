<script lang="ts">
	import { ArrowDown, ArrowUp, PlusIcon, SaveIcon } from "lucide-svelte";
	import { Menu, Notice } from "obsidian";
	import { ICON_SIZE } from "src/const";
	import type { EdgeField } from "src/interfaces/settings";
	import type BreadcrumbsPlugin from "src/main";
	import { Mermaid } from "src/utils/mermaid";
	import {
		get_transitive_rule_name,
		stringify_transitive_relation,
		transitive_rule_to_edges,
	} from "src/utils/transitive_rules";
	import MermaidDiagram from "../Mermaid/MermaidDiagram.svelte";
	import ChevronOpener from "../button/ChevronOpener.svelte";
	import Tag from "../obsidian/tag.svelte";
	import EdgeFieldSelector from "../selector/EdgeFieldSelector.svelte";

	export let plugin: BreadcrumbsPlugin;

	const settings = plugin.settings;

	let filter = "";
	let transitives = [...settings.implied_relations.transitive];
	const opens = transitives.map(() => false);

	const actions = {
		save: async () => {
			for (const { close_field } of transitives) {
				if (!close_field) {
					return new Notice("Closing field cannot be empty.");
				}
			}

			settings.implied_relations.transitive = transitives;

			await Promise.all([
				plugin.saveSettings(),
				plugin.refresh({ redraw_side_views: true }),
			]);

			// NOTE: saveSettings() resets the dirty flag, but now we have to tell Svelte to react
			plugin = plugin;
		},

		add_transitive: () => {
			transitives.push({
				name: "",
				chain: [],
				rounds: 1,
				close_reversed: false,
				close_field: settings.edge_fields[0].label,
			});

			transitives = transitives;
			settings.is_dirty = true;
		},

		remove_transitive: (i: number) => {
			transitives = transitives.filter((_, j) => j !== i);

			settings.is_dirty = true;
		},

		rename_transitive: (i: number, new_name: string) => {
			if (transitives[i].name === new_name) return;

			transitives[i].name = new_name;

			transitives = transitives;
			settings.is_dirty = true;
		},

		reorder_transitive: (i: number, j: number) => {
			const temp = transitives[i];
			transitives[i] = transitives[j];
			transitives[j] = temp;

			transitives = transitives;
			settings.is_dirty = true;
		},

		add_chain_field: (i: number, field: EdgeField | undefined) => {
			if (!field) return;

			transitives[i].chain.push({ field: field.label });

			transitives = transitives;
			settings.is_dirty = true;
		},

		remove_chain_field: (i: number, j: number) => {
			transitives[i].chain = transitives[i].chain.filter(
				(_, k) => k !== j,
			);

			transitives = transitives;
			settings.is_dirty = true;
		},

		set_close_field: (i: number, field: EdgeField | undefined) => {
			if (!field) return;

			transitives[i].close_field = field.label;

			transitives = transitives;
			settings.is_dirty = true;
		},

		set_rounds: (i: number, rounds: number) => {
			if (isNaN(rounds) || rounds < 0) return;

			transitives[i].rounds = rounds;

			transitives = transitives;
			settings.is_dirty = true;
		},

		set_close_reversed: (i: number, reversed: boolean) => {
			transitives[i].close_reversed = reversed;

			transitives = transitives;
			settings.is_dirty = true;
		},
	};

	const context_menus = {
		chain_field: (rule_i: number, attr_i: number) => (e: MouseEvent) => {
			const menu = new Menu();

			menu.addItem((item) =>
				item
					.setTitle("Remove Field")
					.setIcon("x")
					.onClick(() => actions.remove_chain_field(rule_i, attr_i)),
			);

			menu.showAtMouseEvent(e);
		},
	};
</script>

<div class="BC-custom-transitive-implied-relations">
	<p>
		Transitive implied relations represent <em>chains</em> of your
		Breadcrumbs fields that collapse into a single field. For example, if
		you have the fields: "spouse", "sibling", and "sibling-in-law", you can
		add the transitive chain
		<code>
			{stringify_transitive_relation({
				close_reversed: false,
				close_field: "sibling-in-law",
				chain: [{ field: "spouse" }, { field: "sibling" }],
			})}
		</code>. In other words, your spouse's sibling is your sibling-in-law.
	</p>

	<div class="my-2 flex items-center gap-2">
		<button class="flex items-center gap-1" on:click={actions.save}>
			<SaveIcon size={ICON_SIZE} />
			Save
		</button>

		<div class="flex gap-1">
			<input
				type="text"
				placeholder="Filter Rules by Name"
				bind:value={filter}
			/>
			<button
				class="w-8"
				aria-label="Clear Filter"
				disabled={filter === ""}
				on:click={() => (filter = "")}
			>
				X
			</button>
		</div>

		{#if transitives.length > 3}
			<button class="w-8" aria-label="Jump to bottom">
				<a href="#BC-transitive-rule-{transitives.length - 1}">
					<ArrowDown size={ICON_SIZE} />
				</a>
			</button>
		{/if}

		{#if settings.is_dirty}
			<span class="text-warning">Unsaved changes</span>
		{/if}
	</div>

	<div class="flex flex-col gap-3">
		{#each transitives
			.map( (rule, rule_i) => ({ rule, rule_i, name: get_transitive_rule_name(rule) }), )
			.filter( (r) => r.name.includes(filter.toLowerCase()), ) as { rule, rule_i, name } (name + rule_i)}
			<!--  -->
			<details
				id="BC-transitive-rule-{rule_i}"
				class="scroll-mt-24 rounded border p-2"
				bind:open={opens[rule_i]}
			>
				<summary class="flex items-center justify-between gap-2">
					<div class="flex items-center gap-2">
						<ChevronOpener open={opens[rule_i]} />

						<code>
							{name} ({rule.rounds} rounds)
						</code>
					</div>

					<div class="flex gap-1">
						<button
							disabled={rule_i === 0}
							on:click={() =>
								actions.reorder_transitive(rule_i, rule_i - 1)}
						>
							<ArrowUp size={ICON_SIZE} />
						</button>
						<button
							disabled={rule_i === transitives.length - 1}
							on:click={() =>
								actions.reorder_transitive(rule_i, rule_i + 1)}
						>
							<ArrowDown size={ICON_SIZE} />
						</button>

						<button
							aria-label="Delete Transitive Implied Relation"
							on:click={() => actions.remove_transitive(rule_i)}
						>
							X
						</button>
					</div>
				</summary>

				{#key rule}
					<div class="my-2 flex flex-col gap-3 px-4 py-2">
						<div class="flex flex-wrap items-center gap-3">
							<span class="font-semibold">Edge Chain:</span>

							{#if rule.chain.length}
								<div class="flex flex-wrap gap-3">
									{#each rule.chain as attr, attr_i (attr_i + (attr.field ?? ""))}
										<Tag
											tag={attr.field ?? ""}
											title="Right click for more actions."
											on:contextmenu={context_menus.chain_field(
												rule_i,
												attr_i,
											)}
										/>
									{/each}
								</div>
							{:else}
								<span class="search-empty-state my-0">
									No fields in the chain.
								</span>
							{/if}

							<EdgeFieldSelector
								fields={settings.edge_fields}
								on:select={(e) =>
									actions.add_chain_field(rule_i, e.detail)}
							/>
						</div>

						<div>
							<span class="font-semibold">Closing Field: </span>

							<EdgeFieldSelector
								undefine_on_change={false}
								fields={settings.edge_fields}
								field={settings.edge_fields.find(
									(f) => f.label === rule.close_field,
								)}
								on:select={(e) =>
									actions.set_close_field(rule_i, e.detail)}
							/>
						</div>

						<div class="flex items-center gap-2">
							<span class="font-semibold">Close Reversed: </span>

							<input
								type="checkbox"
								bind:checked={rule.close_reversed}
								on:click={(e) =>
									actions.set_close_reversed(
										rule_i,
										e.currentTarget.checked,
									)}
							/>
						</div>

						<div>
							<span class="font-semibold">Rounds: </span>

							<input
								type="number"
								min={0}
								max={100}
								value={rule.rounds}
								on:blur={(e) =>
									actions.set_rounds(
										rule_i,
										+e.currentTarget.value,
									)}
							/>
						</div>

						<div class="flex flex-wrap items-center gap-3">
							<span class="font-semibold">Name (optional):</span>

							<input
								type="text"
								value={rule.name}
								placeholder="Rule Name"
								on:blur={(e) =>
									actions.rename_transitive(
										rule_i,
										e.currentTarget.value,
									)}
							/>
						</div>

						{#if opens[rule_i]}
							<MermaidDiagram
								{plugin}
								mermaid={Mermaid.from_edges(
									transitive_rule_to_edges(rule),
									{
										show_attributes: ["field"],
										collapse_opposing_edges: false,
									},
								)}
							/>
						{/if}
					</div>
				{/key}
			</details>
		{/each}

		<button
			class="flex items-center gap-1"
			on:click={actions.add_transitive}
		>
			<PlusIcon size={ICON_SIZE} />
			Add New Transitive Implied Relation
		</button>
	</div>
</div>

<style>
	.border {
		border: var(--modal-border-width) solid
			var(--background-modifier-border);
	}
</style>
