<script lang="ts">
	import type BreadcrumbsPlugin from "src/main";
	import { remove_duplicates_by_equals } from "src/utils/arrays";
	import { resolve_field_group_labels } from "src/utils/edge_fields";
	import MergeFieldsButton from "../button/MergeFieldsButton.svelte";
	import TrailViewGrid from "./TrailViewGrid.svelte";
	import TrailViewPath from "./TrailViewPath.svelte";
	import { TraversalOptions } from "wasm/pkg/breadcrumbs_graph_wasm";
	import { log } from "src/logger";

	export let plugin: BreadcrumbsPlugin;
	export let file_path: string;

	// TODO: I've copped-out here, building the view from edge_tree seems crazy hard.
	// So I just use all_paths
	// const base_traversal = (attr: EdgeAttrFilters) =>
	// 	Traverse.tree_to_all_paths(
	// 		Traverse.build_tree(plugin.graph, file_path, {}, (e) =>
	// 			has_edge_attrs(e, attr),
	// 		),
	// 	);

	$: edge_field_labels = resolve_field_group_labels(
		plugin.settings.edge_field_groups,
		plugin.settings.views.page.trail.field_group_labels,
	);

	// $: log.debug("edge_field_labels", edge_field_labels);

	$: traversal_options = new TraversalOptions(
		[file_path],
		edge_field_labels,
		100,
		!plugin.settings.views.page.trail.merge_fields,
	);

	// $: log.debug("traversal_options", traversal_options.toString());

	$: traversal_data = plugin.graph.rec_traverse(traversal_options);

	$: all_paths = traversal_data.to_paths();

	// $: all_paths.forEach((path) => log.debug(path.toString()));

	// $: all_paths = plugin.graph.hasNode(file_path)
	// 	? plugin.settings.views.page.trail.merge_fields
	// 		? base_traversal({ $or_fields: edge_field_labels })
	// 		: edge_field_labels.flatMap((field) => base_traversal({ field }))
	// 	: [];

	$: selected_paths =
		plugin.settings.views.page.trail.selection === "all"
			? all_paths
			: plugin.settings.views.page.trail.selection === "shortest"
				? all_paths.slice(0, 1)
				: plugin.settings.views.page.trail.selection === "longest"
					? all_paths.slice(-1)
					: [];

	$: MAX_DEPTH = Math.max(0, ...selected_paths.map((p) => p.length()));
	$: depth = Math.min(
		MAX_DEPTH,
		plugin.settings.views.page.trail.default_depth,
	);

	// Slice the paths to the chosen max depth.
	$: truncated_paths = selected_paths.map((path) => path.truncate(depth));

	// Remove duplicates by the target_ids of the path.
	$: deduped_paths =
		// There are no duplicates if the depth is the max depth.
		// The traversal wouldn't add them in the first place.
		depth === MAX_DEPTH
			? truncated_paths
			: remove_duplicates_by_equals(truncated_paths, (a, b) => a.equals(b));

	// NOTE: Only sort after slicing, so that the depth is taken into account.
	$: sorted_paths = deduped_paths.sort((a, b) => {
		const len_diff = b.length() - a.length();

		// Focus on run-length first
		if (len_diff !== 0) {
			return len_diff;
		}
		// Then focus on the alphabetical order of the target_ids
		else {
			const a_target = a.get_first_target();
			const b_target = b.get_first_target();

			if (a_target === undefined && b_target === undefined) return 0;
			if (a_target === undefined) return -1;
			if (b_target === undefined) return 1;
			else return a_target.localeCompare(b_target);
		}
	});
</script>

<div>
	{#key sorted_paths}
		{#if sorted_paths.length}
			<div
				class="mb-1 flex flex-wrap justify-between gap-3"
				class:hidden={!plugin.settings.views.page.trail.show_controls}
			>
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

				<MergeFieldsButton
					bind:merge_fields={plugin.settings.views.page.trail
						.merge_fields}
				/>

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
						{depth}/{MAX_DEPTH}
					</span>

					<button
						class="aspect-square text-lg"
						aria-label="Increase max depth"
						disabled={depth >= MAX_DEPTH}
						on:click={() => (depth = Math.min(MAX_DEPTH, depth + 1))}
					>
						+
					</button>
				</div>
			</div>

			{#if plugin.settings.views.page.trail.format === "grid"}
				<TrailViewGrid {plugin} all_paths={sorted_paths} />
			{:else if plugin.settings.views.page.trail.format === "path"}
				<TrailViewPath {plugin} all_paths={sorted_paths} />
			{/if}
		{:else if plugin.settings.views.page.trail.no_path_message}
			<p class="BC-trail-view-no-path search-empty-state">
				{plugin.settings.views.page.trail.no_path_message}
			</p>
		{/if}
	{/key}
</div>
