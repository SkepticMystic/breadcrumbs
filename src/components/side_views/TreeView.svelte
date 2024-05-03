<script lang="ts">
	import { Traverse } from "src/graph/traverse";
	import {
		get_edge_sorter,
		has_edge_attrs,
		type EdgeAttrFilters,
	} from "src/graph/utils";
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

	export let plugin: BreadcrumbsPlugin;

	let {
		edge_sort_id,
		merge_fields,
		show_attributes,
		show_node_options,
		field_group_labels,
		collapse,
	} = plugin.settings.views.side.tree;

	const base_traversal = (attr: EdgeAttrFilters) =>
		Traverse.build_tree(
			plugin.graph,
			$active_file_store!.path,
			// TODO: Customisable max depth
			{ max_depth: 20 },
			(edge) => has_edge_attrs(edge, attr),
		);

	$: sort = get_edge_sorter(edge_sort_id, plugin.graph);

	$: edge_field_labels = resolve_field_group_labels(
		plugin.settings.edge_field_groups,
		field_group_labels,
	);

	$: tree =
		$active_file_store && plugin.graph.hasNode($active_file_store.path)
			? merge_fields
				? base_traversal({ $or_fields: edge_field_labels })
				: edge_field_labels.flatMap((field) =>
						base_traversal({ field }),
					)
			: [];
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
		{#key tree || sort}
			{#if tree.length}
				<NestedEdgeList
					{sort}
					{tree}
					{plugin}
					{show_attributes}
					{show_node_options}
					open_signal={!collapse}
				/>
			{:else}
				<div class="search-empty-state">No paths found</div>
			{/if}
		{/key}
	</div>
</div>
