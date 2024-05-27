<script lang="ts">
	import type BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import { resolve_field_group_labels } from "src/utils/edge_fields";
	import NestedEdgeList from "../NestedEdgeList.svelte";
	import ChevronCollapseButton from "../button/ChevronCollapseButton.svelte";
	import MergeFieldsButton from "../button/MergeFieldsButton.svelte";
	import RebuildGraphButton from "../button/RebuildGraphButton.svelte";
	import EdgeSortIdSelector from "../selector/EdgeSortIdSelector.svelte";
	import FieldGroupLabelsSelector from "../selector/FieldGroupLabelsSelector.svelte";
	import ShowAttributesSelectorMenu from "../selector/ShowAttributesSelectorMenu.svelte";
	import {
		FlatRecTraversalResult,
		TraversalOptions,
		create_edge_sorter,
	} from "wasm/pkg/breadcrumbs_graph_wasm";

	export let plugin: BreadcrumbsPlugin;

	let {
		edge_sort_id,
		merge_fields,
		show_attributes,
		show_node_options,
		field_group_labels,
		collapse,
	} = plugin.settings.views.side.tree;

	const edge_field_labels = resolve_field_group_labels(
		plugin.settings.edge_field_groups,
		field_group_labels,
	);

	let data: FlatRecTraversalResult | undefined = undefined;

	$: sort = create_edge_sorter(edge_sort_id.field, edge_sort_id.order === -1);
	
	$: tree = $active_file_store && plugin.graph.has_node($active_file_store.path)
		? plugin.graph.rec_traverse(
				new TraversalOptions(
					[$active_file_store!.path],
					edge_field_labels,
					20,
					!merge_fields,
				),
			)
		: undefined;
	
	$: {
		tree?.sort(plugin.graph, sort);

		data = tree?.to_flat();

		// console.trace(data, data?.data.length);
	}
</script>

<div class="markdown-rendered BC-tree-view">
	<div class="nav-header">
		<div class="nav-buttons-container">
			<RebuildGraphButton
				cls="clickable-icon nav-action-button"
				{plugin}
			/>

			<EdgeSortIdSelector
				cls="clickable-icon nav-action-button"
				exclude_fields={[]}
				bind:edge_sort_id
			/>

			<ShowAttributesSelectorMenu
				cls="clickable-icon nav-action-button"
				bind:show_attributes
			/>

			<ChevronCollapseButton
				cls="clickable-icon nav-action-button"
				bind:collapse
			/>

			<MergeFieldsButton
				cls="clickable-icon nav-action-button"
				bind:merge_fields
			/>

			<FieldGroupLabelsSelector
				cls="clickable-icon nav-action-button"
				edge_field_groups={plugin.settings.edge_field_groups}
				bind:field_group_labels
			/>
		</div>
	</div>

	<div class="BC-tree-view-items">
		{#key data}
			{#if data && !data.is_empty()}
				<NestedEdgeList
					{plugin}
					{show_attributes}
					{show_node_options}
					data={data.data}
					items={data.entry_nodes}
					open_signal={!collapse}
				/>
			{:else}
				<div class="search-empty-state">No paths found</div>
			{/if}
		{/key}
	</div>
</div>
