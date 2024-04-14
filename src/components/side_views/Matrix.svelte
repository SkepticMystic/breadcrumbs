<script lang="ts">
	import { get_edge_sorter, has_edge_attrs } from "src/graph/utils";
	import type BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import { group_by } from "src/utils/arrays";
	import { resolve_field_group_labels } from "src/utils/edge_fields";
	import RebuildGraphButton from "../button/RebuildGraphButton.svelte";
	import EdgeSortIdSelector from "../selector/EdgeSortIdSelector.svelte";
	import FieldGroupSelector from "../selector/FieldGroupLabelsSelector.svelte";
	import ShowAttributesSelectorMenu from "../selector/ShowAttributesSelectorMenu.svelte";
	import MatrixEdgeField from "./MatrixEdgeField.svelte";

	export let plugin: BreadcrumbsPlugin;

	let { edge_sort_id, field_group_labels, show_attributes } =
		plugin.settings.views.side.matrix;

	$: edge_field_labels = resolve_field_group_labels(
		plugin.settings.edge_field_groups,
		field_group_labels,
	);

	$: grouped_out_edges =
		$active_file_store &&
		// Even tho we ensure the graph is built before the views are registered,
		// Existing views still try render before the graph is built.
		plugin.graph.hasNode($active_file_store.path)
			? group_by(
					plugin.graph
						.get_out_edges($active_file_store.path)
						.filter((e) =>
							has_edge_attrs(e, {
								$or_fields: edge_field_labels,
							}),
						),
					(e) => e.attr.field,
				)
			: null;

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
				exclude_fields={["field", "neighbour-field:"]}
				bind:edge_sort_id
			/>

			<!-- We can exclude alot of attrs, since they're implied by other info on the Matrix -->
			<ShowAttributesSelectorMenu
				cls="clickable-icon nav-action-button"
				exclude_attributes={["field", "explicit"]}
				bind:show_attributes
			/>

			<FieldGroupSelector
				cls="clickable-icon nav-action-button"
				{plugin}
				bind:field_group_labels
			/>
		</div>
	</div>

	{#key grouped_out_edges}
		{#if grouped_out_edges}
			<div>
				{#each Object.entries(grouped_out_edges) as [field, edges]}
					{#if edges?.length}
						<MatrixEdgeField
							{sort}
							{edges}
							{field}
							{plugin}
							{show_attributes}
						/>
					{/if}
				{/each}
			</div>
		{:else}
			<p class="search-empty-state">No outgoings edges</p>
		{/if}
	{/key}
</div>
