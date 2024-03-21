<script lang="ts">
	import { Compass } from "lucide-svelte";
	import type { EdgeSortId } from "src/const/graph";
	import { type Direction } from "src/const/hierarchies";
	import { Traverse } from "src/graph/traverse";
	import { get_edge_sorter, has_edge_attrs } from "src/graph/utils";
	import type BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import NestedEdgeList from "./NestedEdgeList.svelte";
	import RebuildGraphButton from "./RebuildGraphButton.svelte";
	import DirectionSelector from "./selector/DirectionSelector.svelte";
	import EdgeSortIdSelector from "./selector/EdgeSortIdSelector.svelte";

	export let plugin: BreadcrumbsPlugin;

	let dir: Direction = plugin.settings.views.side.tree.default_dir;
	let edge_sort_id: EdgeSortId = { field: "basename", order: 1 };

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
	<div class="nav-header flex flex-wrap justify-between gap-2">
		<RebuildGraphButton {plugin} />

		<div class="flex items-center gap-1">
			<span class="flex items-center" aria-label="Change direction">
				<Compass size="20" />
			</span>
			<DirectionSelector bind:dir />
		</div>

		<EdgeSortIdSelector bind:edge_sort_id />
	</div>

	<div class="BC-tree-view-items">
		{#key nested_edges || sort}
			<!-- TODO: Could add field_prefix here, but it's hardcoded off for now -->
			{#if nested_edges.length}
				<NestedEdgeList
					{sort}
					{plugin}
					{nested_edges}
					field_prefix={false}
					show_node_options={plugin.settings.views.side.tree
						.show_node_options}
				/>
			{:else}
				<p class="text-faint">No paths found</p>
			{/if}
		{/key}
	</div>
</div>
