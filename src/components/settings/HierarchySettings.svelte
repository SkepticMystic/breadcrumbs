<script lang="ts">
	import {
		ArrowDown,
		ArrowUp,
		PlusIcon,
		SettingsIcon,
		Trash2Icon,
	} from "lucide-svelte";
	import { ICON_SIZE } from "src/const";
	import { ARROW_DIRECTIONS, DIRECTIONS } from "src/const/hierarchies";
	import type BreadcrumbsPlugin from "src/main";
	import { ImpliedRelationshipsSettingsModal } from "src/modals/ImpliedRelationshipsSettingsModal";
	import { swap_items } from "src/utils/arrays";
	import { blank_hierarchy } from "src/utils/hierarchies";
	import { split_and_trim } from "src/utils/strings";
	import ChevronOpener from "../ChevronOpener.svelte";

	export let plugin: BreadcrumbsPlugin;

	let hierarchies = [...plugin.settings.hierarchies];
	const opens = hierarchies.map(() => false);

	async function update() {
		plugin.settings.hierarchies = hierarchies;

		await plugin.saveSettings();
	}
</script>

<div class="">
	<div class="mb-2 flex gap-1">
		<button
			aria-label="Add New Hierarchy"
			on:click={async () =>
				(hierarchies = [...hierarchies, blank_hierarchy()])}
		>
			<PlusIcon size={ICON_SIZE} />
		</button>

		<button
			aria-label="Reset All Hierarchies"
			on:click={async () => {
				if (
					window.confirm(
						"Are you sure you want to reset all hierarchies?",
					)
				) {
					hierarchies = [];
					await update();
					await plugin.refresh();
				}
			}}
		>
			<Trash2Icon size={ICON_SIZE} />
		</button>
	</div>

	{#each hierarchies as hier, i (Object.values(hier.dirs).flat())}
		<details class="BC-Hier-Details rounded p-2" open={opens[i]}>
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<!-- svelte-ignore a11y-no-static-element-interactions -->
			<summary
				class="flex items-center justify-between"
				on:click={() => (opens[i] = !opens[i])}
			>
				<div class="flex items-center gap-2">
					<ChevronOpener open={opens[i]} />

					<span>
						{DIRECTIONS.map((dir) => hier.dirs[dir].join(", "))
							.map((fields) => `(${fields})`)
							.join(" ")}
					</span>
				</div>

				<span class="pb-1">
					<button
						aria-label="Hierarchy Settings"
						on:click={async () => {
							new ImpliedRelationshipsSettingsModal(
								plugin.app,
								plugin,
								i,
							).open();
						}}
					>
						<SettingsIcon size={ICON_SIZE} />
					</button>

					<button
						aria-label="Remove Hierarchy"
						on:click={async () => {
							// NOTE: In future, if any setting depends on a hierarchy, we'll need to update that setting here.

							hierarchies.splice(i, 1);

							await update();
							await plugin.refresh();
						}}
					>
						<Trash2Icon size={ICON_SIZE} />
					</button>

					<button
						aria-label="Swap with Hierarchy Below"
						on:click={async () => {
							hierarchies = swap_items(i, i + 1, hierarchies);
							await update();
						}}
					>
						<ArrowDown size={ICON_SIZE} />
					</button>

					<button
						aria-label="Swap with Hierarchy Above"
						on:click={async () => {
							hierarchies = swap_items(i, i - 1, hierarchies);
							await update();
						}}
					>
						<ArrowUp size={ICON_SIZE} />
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
							value={hier.dirs[dir]?.join(", ") ?? ""}
							on:blur={async (e) => {
								hierarchies[i].dirs[dir] = split_and_trim(
									e.currentTarget.value,
								);

								await update();
								await plugin.refresh();
							}}
						/>
					</div>
				{/each}
			</div>
		</details>
	{/each}
</div>

<style>
	label.BC-Arrow-Label {
		display: inline-block;
		width: 20px !important;
	}

	details.BC-Hier-Details {
		border: 1px solid var(--background-modifier-border);
	}
	.BC-Hier-Details summary::marker {
		font-size: 10px;
	}
</style>
