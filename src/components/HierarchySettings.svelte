<script lang="ts">
	import type BreadcrumbsPlugin from "main";
	import { ARROW_DIRECTIONS, DIRECTIONS } from "src/const/hierarchies";
	import { swap_items } from "src/utils/arrays";
	import { blank_hierarchy } from "src/utils/hierarchies";
	import { split_and_trim } from "src/utils/strings";

	export let plugin: BreadcrumbsPlugin;

	let hierarchies = [...plugin.settings.hierarchies];

	async function update() {
		plugin.settings.hierarchies = hierarchies;

		await plugin.saveSettings();
	}
</script>

<div>
	<div class="BC-Buttons">
		<button
			aria-label="Add New Hierarchy"
			on:click={async () =>
				(hierarchies = [...hierarchies, blank_hierarchy()])}
		>
			<div class="icon">
				<!-- <FaPlus /> --> +
			</div>
		</button>

		<button
			aria-label="Reset All Hierarchies"
			on:click={async () => {
				if (window.confirm("Are you sure?")) {
					hierarchies = [];
					await update();
				}
			}}
		>
			<div class="icon">
				<!-- <FaRegTrashAlt /> --> X
			</div>
		</button>
	</div>

	<div>
		{#each hierarchies as hier, i}
			<details class="BC-Hier-Details">
				<summary>
					<span>
						{DIRECTIONS.map((dir) => hier[dir].join(", "))
							.map((fields) => `(${fields})`)
							.join(" ")}
					</span>

					<span class="BC-Buttons">
						<button
							aria-label="Swap with Hierarchy Above"
							on:click={async () => {
								hierarchies = swap_items(i, i - 1, hierarchies);
								await update();
							}}
						>
							↑
						</button>

						<button
							aria-label="Swap with Hierarchy Below"
							on:click={async () => {
								hierarchies = swap_items(i, i + 1, hierarchies);
								await update();
							}}
						>
							↓
						</button>

						<button
							aria-label="Remove Hierarchy"
							on:click={async () => {
								// NOTE: In future, if any setting depends on a hierarchy, we'll need to update that setting here.

								hierarchies.splice(i, 1);
								await update();
							}}
						>
							X
						</button>
					</span>
				</summary>

				<div>
					{#each DIRECTIONS as dir}
						<div>
							<label class="BC-Arrow-Label" for={dir}>
								{ARROW_DIRECTIONS[dir]}
							</label>

							<input
								type="text"
								size="20"
								name={dir}
								value={hier[dir]?.join(", ") ?? ""}
								on:change={async (e) => {
									hierarchies[i][dir] = split_and_trim(
										e.currentTarget.value,
									);

									// TODO: Debounce this?
									await update();
								}}
							/>
						</div>
					{/each}
				</div>
			</details>
		{/each}
	</div>
</div>

<style>
	label.BC-Arrow-Label {
		display: inline-block;
		width: 20px !important;
	}
	div.BC-Buttons {
		padding-bottom: 5px;
	}

	details.BC-Hier-Details {
		border: 1px solid var(--background-modifier-border);
		border-radius: 10px;
		padding: 10px 5px 10px 10px;
		margin-bottom: 15px;
	}
	.BC-Hier-Details summary::marker {
		font-size: 10px;
	}

	.BC-Hier-Details summary button {
		float: right;
	}
</style>
