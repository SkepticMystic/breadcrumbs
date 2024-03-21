<script lang="ts">
	import { stringify_transitive_relation } from "src/graph/builders/implied/custom/transitive";
	import type BreadcrumbsPlugin from "src/main";
	import HierarchyFieldSelector from "../selector/HierarchyFieldSelector.svelte";

	export let plugin: BreadcrumbsPlugin;

	let transitives = [...plugin.settings.custom_implied_relations.transitive];
	const opens = transitives.map(() => false);

	const save = async () => {
		plugin.settings.custom_implied_relations.transitive = transitives;

		await plugin.saveSettings();
		await plugin.refresh();
	};
</script>

<div class="BC-custom-transitive-implied-relations px-5">
	<p>
		Transitive implied relations represent <em>chains</em> of your
		Breadcrumbs fields that collapse into a single field. For example, if
		you have the fields: "spouse", "sibling", and "sibling-in-law", you can
		add the transitive chain
		<code>[spouse, sibling] -> sibling-in-law</code>. In other words, your
		spouse's sibling is your sibling-in-law.
	</p>

	<div class="my-2">
		<button
			aria-label="Add New Transitive Implied Relation"
			on:click={async () =>
				(transitives = [
					...transitives,
					{
						chain: [],
						rounds: 1,
						close_field: plugin.settings.hierarchies[0].dirs.up[0],
					},
				])}
		>
			+
		</button>

		<button on:click={save}> Save </button>
	</div>

	<div class="flex flex-col gap-3">
		{#each transitives as transitive, i}
			<details open={opens[i]}>
				<!-- svelte-ignore a11y-click-events-have-key-events -->
				<!-- svelte-ignore a11y-no-static-element-interactions -->
				<summary on:click={() => (opens[i] = !opens[i])}>
					<code>
						{stringify_transitive_relation(transitive)}
						({transitive.rounds} rounds)
					</code>

					<button
						aria-label="Delete Transitive Implied Relation"
						on:click={() =>
							(transitives = transitives.filter(
								(_, j) => j !== i,
							))}
					>
						X
					</button>
				</summary>

				{#key transitive}
					<div class="my-2 flex flex-col gap-2 border px-4 py-2">
						<div class="flex flex-wrap items-center gap-3">
							<span class="font-semibold">Chain:</span>

							{#if transitive.chain.length}
								<div class="flex flex-wrap gap-1">
									{#each transitive.chain as item, i}
										<div>
											<code>{item.field}</code>

											<button
												on:click={() => {
													transitives[i].chain =
														transitive.chain.filter(
															(_, j) => j !== i,
														);
												}}
											>
												X
											</button>
										</div>
									{/each}
								</div>
							{:else}
								<span>
									No fields in the chain. Use the selector to
									add some.
								</span>
							{/if}

							<HierarchyFieldSelector
								hierarchies={plugin.settings.hierarchies}
								on:select={(e) => {
									console.log(e.detail);
									if (e.detail)
										transitives[i].chain = [
											...transitive.chain,
											{ field: e.detail },
										];
								}}
							/>
						</div>

						<div>
							<span class="font-semibold">Closing Field: </span>

							<HierarchyFieldSelector
								hierarchies={plugin.settings.hierarchies}
								field={transitive.close_field}
								on:select={(e) => {
									console.log(e.detail);
									if (e.detail)
										transitives[i].close_field = e.detail;
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

									if (!isNaN(num))
										transitives[i].rounds = num;
								}}
							/>
						</div>
					</div>
				{/key}
			</details>
		{/each}
	</div>
</div>

<style>
	.border {
		border-radius: var(--modal-radius);
		border: var(--modal-border-width) solid var(--modal-border-color);
	}
</style>
