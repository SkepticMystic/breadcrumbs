<script lang="ts">
	import type { EdgeSortId } from "src/const/graph";
	import {
		EDGE_ATTRIBUTES,
		type EdgeAttribute,
	} from "src/graph/MyMultiGraph";
	import { get_edge_sorter, has_edge_attrs } from "src/graph/utils";
	import type BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import RebuildGraphButton from "../RebuildGraphButton.svelte";
	import EdgeSortIdSelector from "../selector/EdgeSortIdSelector.svelte";
	import ShowAttributesSelectorMenu from "../selector/ShowAttributesSelectorMenu.svelte";
	import MatrixHierarchy from "./MatrixHierarchy.svelte";

	export let plugin: BreadcrumbsPlugin;

	let edge_sort_id: EdgeSortId = { field: "basename", order: 1 };
	let show_attributes: EdgeAttribute[] = EDGE_ATTRIBUTES.slice();

	$: all_out_edges =
		$active_file_store &&
		// Even tho we ensure the graph is built before the views are registered,
		// Existing views still try render before the graph is built.
		plugin.graph.hasNode($active_file_store.path)
			? plugin.graph.get_out_edges($active_file_store.path)
			: [];

	$: sort = get_edge_sorter(edge_sort_id, plugin.graph);
</script>

<div class="markdown-rendered BC-matrix-view">
	<div class="nav-header">
		<div class="nav-buttons-container">
			<RebuildGraphButton
				cls="clickable-icon nav-action-button"
				{plugin}
			/>

			<EdgeSortIdSelector
				cls="clickable-icon nav-action-button"
				exclude_fields={["field", "neighbour-dir:", "neighbour-field:"]}
				bind:edge_sort_id
			/>

			<!-- We can exclude alot of attrs, since they're implied by other info on the Matrix -->
			<ShowAttributesSelectorMenu
				cls="clickable-icon nav-action-button"
				exclude_attributes={["hierarchy_i", "dir", "field", "explicit"]}
				bind:show_attributes
			/>
		</div>
	</div>

	{#key all_out_edges}
		{#if all_out_edges.length}
			<div>
				{#each plugin.settings.hierarchies as hierarchy, hierarchy_i}
					{@const hierarchy_out_edges = all_out_edges.filter((e) =>
						has_edge_attrs(e, { hierarchy_i }),
					)}
					{#if hierarchy_out_edges.length}
						<MatrixHierarchy
							{plugin}
							{hierarchy}
							{show_attributes}
							{hierarchy_out_edges}
							{sort}
						/>
						{#if plugin.settings.hierarchies.length !== hierarchy_i + 1}
							<hr class="my-3" />
						{/if}
					{/if}
				{/each}
			</div>
		{:else}
			<p class="search-empty-state">No outgoings edges</p>
		{/if}
	{/key}
</div>
