<script lang="ts">
	import { Compass } from "lucide-svelte";
	import type { EdgeSortId } from "src/const/graph";
	import { type Direction } from "src/const/hierarchies";
	import { Traverse } from "src/graph/traverse";
	import { get_edge_sorter, has_edge_attrs } from "src/graph/utils";
	import type BreadcrumbsPlugin from "src/main";
	import { DirectionSelectorMenu } from "src/menus/DirectionSelectorMenu";
	import { active_file_store } from "src/stores/active_file";
	import NestedEdgeList from "./NestedEdgeList.svelte";
	import RebuildGraphButton from "./RebuildGraphButton.svelte";
	import EdgeSortIdSelector from "./selector/EdgeSortIdSelector.svelte";
	import type { EdgeAttribute } from "src/graph/MyMultiGraph";
	import ShowAttributesSelectorMenu from "./selector/ShowAttributesSelectorMenu.svelte";
	import { ICON_SIZE } from "src/const";
	import { url_search_params } from "src/utils/url";

	export let plugin: BreadcrumbsPlugin;

	let dir: Direction = plugin.settings.views.side.tree.default_dir;
	let edge_sort_id: EdgeSortId = { field: "basename", order: 1 };
	let show_attributes: EdgeAttribute[] = [];

	$: nested_edges =
		$active_file_store &&
		// Even tho we ensure the graph is built before the views are registered,
		// Existing views still try render before the graph is built.
		plugin.graph.hasNode($active_file_store.path)
			? plugin.settings.hierarchies
					.map((_hierarchy, hierarchy_i) =>
						Traverse.nest_all_paths(
							Traverse.all_paths(
								"depth_first",
								plugin.graph,
								$active_file_store!.path,
								// Here, we ensure an edge is only considered part of a path if it is from the same hierarchy as the previous edges
								(edge) =>
									has_edge_attrs(edge, { dir, hierarchy_i }),
							),
						),
					)
					.flat()
			: [];

	$: sort = get_edge_sorter(edge_sort_id, plugin.graph);
</script>

<div class="markdown-rendered BC-tree-view -mt-2">
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
				exclude_attributes={["dir"]}
				cls="clickable-icon nav-action-button"
				bind:show_attributes
			/>

			<button
				class="clickable-icon nav-action-button flex items-center gap-2"
				aria-label="Change direction"
				on:click={(e) =>
					DirectionSelectorMenu({
						value: dir,
						cb: (value) => (dir = value),
					}).showAtMouseEvent(e)}
			>
				<Compass size={ICON_SIZE} />

				<span>{dir}</span>
			</button>
		</div>
	</div>

	<div class="BC-tree-view-items">
		{#key nested_edges || sort}
			{#if nested_edges.length}
				<NestedEdgeList
					{sort}
					{plugin}
					{nested_edges}
					{show_attributes}
					show_node_options={plugin.settings.views.side.tree
						.show_node_options}
				/>
			{:else}
				<p class="text-faint">
					No paths found in {url_search_params({ dir })}
				</p>
			{/if}
		{/key}
	</div>
</div>
