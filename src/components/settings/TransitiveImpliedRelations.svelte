<script lang="ts">
	import type BreadcrumbsPlugin from "src/main";
	import HierarchyFieldSelector from "../HierarchyFieldSelector.svelte";

	export let plugin: BreadcrumbsPlugin;

	let transitives = [...plugin.settings.custom_implied_relations.transitive];
	const opens = transitives.map(() => false);

	const save = async () => {
		plugin.settings.custom_implied_relations.transitive = transitives;

		await plugin.saveSettings();
		await plugin.refresh();
	};
</script>

<div class="BC-custom-transitive-implied-relations">
	<div>
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
					<span>
						{transitive.chain.join(", ")} -> {transitive.close_field}
						({transitive.rounds} rounds)
					</span>

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

				<div>
					<div>
						<span>Chain</span>

						<div class="flex gap-1">
							{#each transitive.chain as item, i}
								<div class="border p-1">
									<span>{item}</span>
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

						<HierarchyFieldSelector
							hierarchies={plugin.settings.hierarchies}
							on:select={(e) => {
								if (e.detail)
									transitives[i].chain = [
										...transitive.chain,
										{ field: e.detail },
									];
							}}
						/>
					</div>

					<hr />

					<div>
						<span>Close Field</span>

						<HierarchyFieldSelector
							hierarchies={plugin.settings.hierarchies}
							on:select={(e) => {
								if (e.detail)
									transitives[i].close_field = e.detail;
							}}
						/>
					</div>

					<hr />

					<div>
						<span>Rounds</span>

						<input
							type="number"
							min={0}
							max={100}
							bind:value={transitive.rounds}
						/>
					</div>
				</div>
			</details>
		{/each}
	</div>
</div>
