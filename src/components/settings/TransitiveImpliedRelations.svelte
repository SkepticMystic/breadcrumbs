<script lang="ts">
	import { PlusIcon, SaveIcon } from "lucide-svelte";
	import { Notice } from "obsidian";
	import { ICON_SIZE } from "src/const";
	import { stringify_transitive_relation } from "src/graph/builders/implied/transitive";
	import type BreadcrumbsPlugin from "src/main";
	import ChevronOpener from "../button/ChevronOpener.svelte";
	import EdgeFieldSelector from "../selector/EdgeFieldSelector.svelte";

	export let plugin: BreadcrumbsPlugin;

	let transitives = [...plugin.settings.implied_relations.transitive];
	const opens = transitives.map(() => false);

	const save = async () => {
		for (const { close_field } of transitives) {
			if (!close_field) {
				return new Notice("Closing field cannot be empty.");
			}
		}
		plugin.settings.implied_relations.transitive = transitives;

		await plugin.saveSettings();
		await plugin.refresh();
	};
</script>

<div class="BC-custom-transitive-implied-relations">
	<p>
		Transitive implied relations represent <em>chains</em> of your
		Breadcrumbs fields that collapse into a single field. For example, if
		you have the fields: "spouse", "sibling", and "sibling-in-law", you can
		add the transitive chain
		<code>[spouse, sibling] -> sibling-in-law</code>. In other words, your
		spouse's sibling is your sibling-in-law.
	</p>

	<div class="my-2 flex items-center gap-2">
		<button
			aria-label="Add New Transitive Implied Relation"
			on:click={async () =>
				(transitives = [
					...transitives,
					{
						// TODO(NODIR): Add input for name
						name: "",
						chain: [],
						rounds: 1,
						close_reversed: false,
						close_field: plugin.settings.edge_fields[0].label,
					},
				])}
		>
			<PlusIcon size={ICON_SIZE} />
		</button>

		<button class="flex items-center gap-1" on:click={save}>
			<SaveIcon size={ICON_SIZE} />
			Save
		</button>
	</div>

	<div class="flex flex-col gap-3">
		{#each transitives as transitive, t_i}
			<details class="rounded border p-2" bind:open={opens[t_i]}>
				<summary class="flex items-center justify-between gap-2">
					<div class="flex items-center gap-2">
						<ChevronOpener open={opens[t_i]} />

						<code>
							{stringify_transitive_relation(transitive)}
							({transitive.rounds} rounds)
						</code>
					</div>

					<button
						aria-label="Delete Transitive Implied Relation"
						on:click={() =>
							(transitives = transitives.filter(
								(_, j) => j !== t_i,
							))}
					>
						X
					</button>
				</summary>

				{#key transitive}
					<div class="my-2 flex flex-col gap-2 px-4 py-2">
						<div class="flex flex-wrap items-center gap-3">
							<span class="font-semibold">Chain:</span>

							<EdgeFieldSelector
								fields={plugin.settings.edge_fields}
								on:select={(e) => {
									if (e.detail)
										transitive.chain = [
											...transitive.chain,
											{ field: e.detail.label },
										];
								}}
							/>

							{#if transitive.chain.length}
								<div class="flex flex-wrap gap-3">
									{#each transitive.chain as item, c_i (c_i + (item.field ?? ""))}
										<div class="flex items-center gap-1">
											<code>{item.field}</code>

											<button
												class="clickable-icon"
												on:click={() => {
													transitive.chain =
														transitive.chain.filter(
															(_, j) => j !== c_i,
														);
												}}
											>
												X
											</button>
										</div>
									{/each}
								</div>
							{:else}
								<span class="search-empty-state">
									No fields in the chain. Use the selector to
									add some
								</span>
							{/if}
						</div>

						<div>
							<span class="font-semibold">Closing Field: </span>

							<EdgeFieldSelector
								fields={plugin.settings.edge_fields}
								on:select={(e) => {
									if (e.detail) {
										transitive.close_field = e.detail.label;
									}
								}}
							/>
						</div>

						<div>
							<span class="font-semibold">Rounds: </span>

							<input
								type="number"
								min={0}
								max={100}
								value={transitive.rounds}
								on:blur={(e) => {
									const num = +e.currentTarget.value;

									if (!isNaN(num)) transitive.rounds = num;
								}}
							/>
						</div>

						<!-- TODO: close_reversed toggle -->
					</div>
				{/key}
			</details>
		{/each}
	</div>
</div>

<style>
	.border {
		border: var(--modal-border-width) solid
			var(--background-modifier-border);
	}
</style>
