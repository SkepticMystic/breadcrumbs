<script lang="ts">
	import { Traverse } from "src/graph/traverse";
	import { has_edge_attrs } from "src/graph/utils";
	import type BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import TrailViewGrid from "./TrailViewGrid.svelte";
	import TrailViewPath from "./TrailViewPath.svelte";

	export let plugin: BreadcrumbsPlugin;

	const all_paths =
		$active_file_store &&
		// Even tho we ensure the graph is built before the views are registered,
		// Existing views still try render before the graph is built.
		plugin.graph.hasNode($active_file_store.path)
			? plugin.settings.hierarchies
					.map((_hierarchy, hierarchy_i) =>
						Traverse.all_paths(
							"depth_first",
							plugin.graph,
							$active_file_store!.path,
							(edge) =>
								has_edge_attrs(edge, {
									dir: "up",
									hierarchy_i,
								}),
						),
					)
					.flat()
					// This basic sorting can break the continuity of the grid-areas.
					// A better solution would sort the rows to maximise run length.
					.sort((a, b) => b.length - a.length)
			: [];

	$: selected_paths =
		plugin.settings.views.page.trail.selection === "all"
			? all_paths
			: plugin.settings.views.page.trail.selection === "shortest"
				? all_paths.slice(-1)
				: plugin.settings.views.page.trail.selection === "longest"
					? all_paths.slice(0, 1)
					: [[]];

	$: MAX_DEPTH = Math.max(0, ...selected_paths.map((p) => p.length));

	$: depth = Math.min(
		MAX_DEPTH,
		plugin.settings.views.page.trail.default_depth,
	);

	$: sliced_paths = selected_paths.map((path) => path.slice(0, depth));
</script>

<div>
	{#key sliced_paths}
		{#if sliced_paths.length}
			<div class="mb-1.5 flex justify-between gap-3">
				<select
					class="dropdown"
					bind:value={plugin.settings.views.page.trail.format}
					on:change={async () => await plugin.saveSettings()}
				>
					{#each ["grid", "path"] as format}
						<option value={format}> {format} </option>
					{/each}
				</select>

				<select
					class="dropdown"
					bind:value={plugin.settings.views.page.trail.selection}
					on:change={async () => await plugin.saveSettings()}
				>
					{#each ["all", "shortest", "longest"] as s}
						<option value={s}> {s} </option>
					{/each}
				</select>

				<div class="flex items-center gap-1">
					<button
						class="aspect-square text-lg"
						aria-label="Decrease max depth"
						disabled={depth <= 1}
						on:click={() => (depth = Math.max(1, depth - 1))}
					>
						-
					</button>

					<span class="font-mono" aria-label="Max depth">
						{depth}
					</span>

					<button
						class="aspect-square text-lg"
						aria-label="Increase max depth"
						disabled={depth >= MAX_DEPTH}
						on:click={() =>
							(depth = Math.min(MAX_DEPTH, depth + 1))}
					>
						+
					</button>
				</div>
			</div>

			{#if plugin.settings.views.page.trail.format === "grid"}
				<TrailViewGrid {plugin} all_paths={sliced_paths} />
			{:else if plugin.settings.views.page.trail.format === "path"}
				<TrailViewPath {plugin} all_paths={sliced_paths} />
			{/if}
		{:else if plugin.settings.views.page.trail.no_path_message}
			<p class="BC-trail-view-no-path">
				{plugin.settings.views.page.trail.no_path_message}
			</p>
		{/if}
	{/key}
</div>
