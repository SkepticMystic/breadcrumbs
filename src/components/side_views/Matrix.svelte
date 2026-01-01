<script lang="ts">
	import type BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import { resolve_field_group_labels } from "src/utils/edge_fields";
	import { create_edge_sorter } from "wasm/pkg/breadcrumbs_graph_wasm";
	import ChevronCollapseButton from "../button/ChevronCollapseButton.svelte";
	import RebuildGraphButton from "../button/RebuildGraphButton.svelte";
	import EdgeSortIdSelector from "../selector/EdgeSortIdSelector.svelte";
	import FieldGroupSelector from "../selector/FieldGroupLabelsSelector.svelte";
	import ShowAttributesSelectorMenu from "../selector/ShowAttributesSelectorMenu.svelte";
	import MatrixEdgeField from "./MatrixEdgeField.svelte";
	import { untrack } from "svelte";

	interface Props {
		plugin: BreadcrumbsPlugin;
	}

	let { plugin }: Props = $props();

	let settings = $state(structuredClone(plugin.settings.views.side.matrix));
	let is_initial_mount = true;

	$effect(() => {
		// We only want to run this when *we* have changed `settings`,
		// and not when the component is initially mounted into the DOM,
		// or when the settings have been updated externally.
		if (is_initial_mount) {
			is_initial_mount = false;
			return;
		}
		plugin.settings.views.side.matrix = $state.snapshot(settings);
		untrack(() => void plugin.saveSettings());
	});

	let edge_field_labels = $derived(
		resolve_field_group_labels(
			plugin.settings.edge_field_groups,
			settings.field_group_labels,
		),
	);

	let active_file = $derived($active_file_store);

	let grouped_out_edges = $derived(
		active_file &&
			// Even tho we ensure the graph is built before the views are registered,
			// Existing views still try render before the graph is built.
			plugin.graph.has_node(active_file.path)
			? plugin.graph.get_filtered_grouped_outgoing_edges(
					active_file.path,
					edge_field_labels,
				)
			: null,
	);

	let sort = $derived(
		create_edge_sorter(
			settings.edge_sort_id.field,
			settings.edge_sort_id.order === -1,
		),
	);
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
				bind:edge_sort_id={settings.edge_sort_id}
			/>

			<ChevronCollapseButton
				cls="clickable-icon nav-action-button"
				bind:collapse={settings.collapse}
			/>

			<!-- We can exclude alot of attrs, since they're implied by other info on the Matrix -->
			<ShowAttributesSelectorMenu
				cls="clickable-icon nav-action-button"
				exclude_attributes={["field", "explicit"]}
				bind:show_attributes={settings.show_attributes}
			/>

			<FieldGroupSelector
				cls="clickable-icon nav-action-button"
				edge_field_groups={plugin.settings.edge_field_groups}
				bind:field_group_labels={settings.field_group_labels}
			/>
		</div>
	</div>

	{#key grouped_out_edges}
		{#if grouped_out_edges}
			<div>
				{#each plugin.settings.edge_fields as field}
					{@const edges = grouped_out_edges.get_sorted_edges(
						field.label,
						plugin.graph,
						sort,
					)}

					{#if edges?.length}
						<MatrixEdgeField
							{edges}
							{field}
							{plugin}
							show_attributes={settings.show_attributes}
							open={!settings.collapse}
						/>
					{/if}
				{/each}
			</div>
		{:else}
			<p class="search-empty-state">No outgoings edges</p>
		{/if}
	{/key}
</div>
