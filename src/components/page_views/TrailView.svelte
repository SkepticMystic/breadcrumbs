<script lang="ts">
	import { run } from 'svelte/legacy';

	import type BreadcrumbsPlugin from "src/main";
	import { remove_duplicates_by_equals } from "src/utils/arrays";
	import { resolve_field_group_labels } from "src/utils/edge_fields";
	import MergeFieldsButton from "../button/MergeFieldsButton.svelte";
	import TrailViewGrid from "./TrailViewGrid.svelte";
	import TrailViewPath from "./TrailViewPath.svelte";
	import { PathList, TraversalOptions } from "wasm/pkg/breadcrumbs_graph_wasm";
	import { log } from "src/logger";

	interface Props {
		plugin: BreadcrumbsPlugin;
		file_path: string;
	}

	let { plugin = $bindable(), file_path }: Props = $props();

	// TODO: I've copped-out here, building the view from edge_tree seems crazy hard.
	// So I just use all_paths
	// const base_traversal = (attr: EdgeAttrFilters) =>
	// 	Traverse.tree_to_all_paths(
	// 		Traverse.build_tree(plugin.graph, file_path, {}, (e) =>
	// 			has_edge_attrs(e, attr),
	// 		),
	// 	);

	let selected_paths: PathList | undefined = $state(undefined);

	run(() => {
		let edge_field_labels = resolve_field_group_labels(
			plugin.settings.edge_field_groups,
			plugin.settings.views.page.trail.field_group_labels,
		);

		let traversal_options = new TraversalOptions(
			[file_path],
			edge_field_labels,
			5,
			!plugin.settings.views.page.trail.merge_fields,
		);

		let traversal_data = plugin.graph.rec_traverse(traversal_options);

		let all_paths = traversal_data.to_paths();

		selected_paths = all_paths.select(
			plugin.settings.views.page.trail.selection,
		);
	});

	let MAX_DEPTH = $derived(Math.max(0, selected_paths?.max_depth() ?? 0));
	let depth;
	run(() => {
		depth = Math.min(
			MAX_DEPTH,
			plugin.settings.views.page.trail.default_depth,
		);
	});

	let sorted_paths = $derived(selected_paths?.process(plugin.graph, depth));
</script>

<div>
	{#key sorted_paths}
		{#if sorted_paths && sorted_paths.length}
			<div
				class="mb-1 flex flex-wrap justify-between gap-3"
				class:hidden={!plugin.settings.views.page.trail.show_controls}
			>
				<select
					class="dropdown"
					bind:value={plugin.settings.views.page.trail.format}
					onchange={async () => await plugin.saveSettings()}
				>
					{#each ["grid", "path"] as format}
						<option value={format}> {format} </option>
					{/each}
				</select>

				<select
					class="dropdown"
					bind:value={plugin.settings.views.page.trail.selection}
					onchange={async () => await plugin.saveSettings()}
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
						onclick={() => (depth = Math.max(1, depth - 1))}
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
						onclick={() => (depth = Math.min(MAX_DEPTH, depth + 1))}
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
