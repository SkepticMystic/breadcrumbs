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
		FlatTraversalResult,
		TraversalOptions,
		TraversalPostprocessOptions,
		create_edge_sorter,
	} from "wasm/pkg/breadcrumbs_graph_wasm";
	import { untrack } from "svelte";

	let {
		plugin,
	}: {
		plugin: BreadcrumbsPlugin;
	} = $props();

	let edge_sort_id = $state(plugin.settings.views.side.tree.edge_sort_id);
	let merge_fields = $state(plugin.settings.views.side.tree.merge_fields);
	let show_attributes = $state(
		plugin.settings.views.side.tree.show_attributes,
	);
	let show_node_options = $state(
		plugin.settings.views.side.tree.show_node_options,
	);
	let field_group_labels = $state(
		plugin.settings.views.side.tree.field_group_labels,
	);
	let collapse = $state(plugin.settings.views.side.tree.collapse);
	$effect(() => {
		plugin.settings.views.side.tree.edge_sort_id = edge_sort_id;
		plugin.settings.views.side.tree.merge_fields = merge_fields;
		plugin.settings.views.side.tree.show_attributes = show_attributes;
		plugin.settings.views.side.tree.show_node_options = show_node_options;
		plugin.settings.views.side.tree.field_group_labels = field_group_labels;
		plugin.settings.views.side.tree.collapse = collapse;
		untrack(() => void plugin.saveSettings());
	});

	let edge_field_labels = $derived(
		resolve_field_group_labels(
			plugin.settings.edge_field_groups,
			field_group_labels,
		),
	);

	let sort = $derived(
		create_edge_sorter(edge_sort_id.field, edge_sort_id.order === -1),
	);

	let active_file = $derived($active_file_store);

	let tree: FlatTraversalResult | undefined = $derived.by(() => {
		if (active_file && plugin.graph.has_node(active_file.path)) {
			return plugin.graph.rec_traverse_and_process(
				new TraversalOptions(
					[active_file!.path],
					edge_field_labels,
					5,
					!merge_fields,
				),
				new TraversalPostprocessOptions(sort, false),
			);
		} else {
			return undefined;
		}
	});

	// We want to re-sort, when the sorter changes.
	// Because svelte can't track changes to the tree, we need to wrap it in an object.
	let sorted_tree = $derived.by(() => {
		const s = sort;
		untrack(() => tree?.sort(plugin.graph, s));
		return {
			tree: tree,
		};
	});
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
		{#key sorted_tree}
			{#if sorted_tree.tree && !sorted_tree.tree.is_empty()}
				<NestedEdgeList
					{plugin}
					{show_attributes}
					{show_node_options}
					data={sorted_tree.tree.data}
					items={sorted_tree.tree.entry_nodes}
					open_signal={!collapse}
				/>
			{:else}
				<div class="search-empty-state">No paths found</div>
			{/if}
		{/key}
	</div>
</div>
