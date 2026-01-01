<script lang="ts">
	import type BreadcrumbsPlugin from "src/main";
	import { resolve_field_group_labels } from "src/utils/edge_fields";
	import MergeFieldsButton from "../button/MergeFieldsButton.svelte";
	import TrailViewGrid from "./TrailViewGrid.svelte";
	import TrailViewPath from "./TrailViewPath.svelte";
	import {
		PathList,
		TraversalOptions,
	} from "wasm/pkg/breadcrumbs_graph_wasm";
	import { untrack } from "svelte";

	interface Props {
		plugin: BreadcrumbsPlugin;
		file_path: string;
	}

	let { plugin = $bindable(), file_path }: Props = $props();

	let settings = $state(structuredClone(plugin.settings.views.page.trail));
	let is_initial_mount = true;

	$effect(() => {
		// We only want to run this when *we* have changed `settings`,
		// and not when the component is initially mounted into the DOM,
		// or when the settings have been updated externally.
		if (is_initial_mount) {
			is_initial_mount = false;
			return;
		}
		plugin.settings.views.page.trail = $state.snapshot(settings);
		untrack(() => void plugin.saveSettings());
	});

	let data: {
		selected_paths: PathList | undefined;
		hit_depth_limit: boolean;
	} = $derived.by(() => {
		let edge_field_labels = resolve_field_group_labels(
			plugin.settings.edge_field_groups,
			plugin.settings.views.page.trail.field_group_labels,
		);

		let traversal_options = new TraversalOptions(
			[file_path],
			edge_field_labels,
			5, // depth limit
			100, // max nodes to traverse
			!settings.merge_fields,
		);

		let traversal_data = plugin.graph.rec_traverse(traversal_options);

		let all_paths = traversal_data.to_paths();

		return {
			selected_paths: all_paths.select(settings.selection),
			hit_depth_limit: traversal_data.hit_depth_limit,
		};
	});

	let MAX_DEPTH = $derived(
		Math.max(0, data.selected_paths?.max_depth() ?? 0),
	);
	let depth = $state(0);
	$effect(() => {
		depth = Math.min(
			MAX_DEPTH,
			plugin.settings.views.page.trail.default_depth,
		);
	});

	let sorted_paths = $derived(
		data.selected_paths?.process(plugin.graph, depth),
	);
</script>

<div>
	{#key sorted_paths}
		{#if sorted_paths && sorted_paths.length}
			<div
				class="mb-1 flex flex-wrap justify-between gap-3"
				class:hidden={!plugin.settings.views.page.trail.show_controls}
			>
				<!-- TODO: make states out of these binds and add an effect to update the actual settings  -->
				<select
					class="dropdown"
					bind:value={settings.format}
					onchange={async (e) => await plugin.saveSettings()}
				>
					{#each ["grid", "path"] as format}
						<option value={format}> {format} </option>
					{/each}
				</select>

				<select
					class="dropdown"
					bind:value={settings.selection}
					onchange={async () => await plugin.saveSettings()}
				>
					{#each ["all", "shortest", "longest"] as s}
						<option value={s}> {s} </option>
					{/each}
				</select>

				<MergeFieldsButton bind:merge_fields={settings.merge_fields} />

				<div class="flex items-center gap-1">
					<button
						class="aspect-square text-lg"
						aria-label="Decrease max depth"
						disabled={depth <= 1}
						onclick={() => (depth = Math.max(1, depth - 1))}
					>
						-
					</button>

					<span
						class="font-mono"
						aria-label={data.hit_depth_limit
							? "Some paths have been truncated"
							: ""}
					>
						{depth}/{MAX_DEPTH}
						{data.hit_depth_limit ? " (truncated)" : ""}
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

			{#if settings.format === "grid"}
				<TrailViewGrid {plugin} all_paths={sorted_paths} />
			{:else if settings.format === "path"}
				<TrailViewPath {plugin} all_paths={sorted_paths} />
			{/if}
		{:else if plugin.settings.views.page.trail.no_path_message}
			<p class="BC-trail-view-no-path search-empty-state">
				{plugin.settings.views.page.trail.no_path_message}
			</p>
		{/if}
	{/key}
</div>
