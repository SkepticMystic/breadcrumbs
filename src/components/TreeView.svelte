<script lang="ts">
	import { DIRECTIONS, type Direction } from "src/const/hierarchies";
	import { Traverse } from "src/graph/traverse";
	import type BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import NestedEdgeList from "./NestedEdgeList.svelte";

	export let plugin: BreadcrumbsPlugin;

	let dir: Direction = plugin.settings.views.side.tree.default_dir;

	$: nested_edges =
		$active_file_store &&
		// Even tho we ensure the graph is built before the views are registered,
		// Existing views still try render before the graph is built.
		plugin.graph.hasNode($active_file_store.path)
			? plugin.settings.hierarchies
					.map((_hierarchy, i) =>
						Traverse.nest_all_paths(
							Traverse.all_paths(
								"depth_first",
								plugin.graph,
								$active_file_store!.path,
								(edge) =>
									edge.attr.dir === dir &&
									// Here, we ensure an edge is only considered part of a path if it is from the same hierarchy as the previous edges
									edge.attr.hierarchy_i === i,
							),
						),
					)
					.flat()
			: [];
</script>

<div class="markdown-rendered BC-tree-view">
	<div class="BC-tree-view-controls flex justify-between">
		<!-- TODO(#407): Add EdgeSortIdSelector to change sort order on the fly -->
		<span></span>

		<label>
			<span>Direction:</span>

			<select bind:value={dir}>
				{#each DIRECTIONS as dir}
					<option value={dir}>{dir}</option>
				{/each}
			</select>
		</label>
	</div>

	<hr class="mb-2 mt-3" />

	<div class="BC-tree-view-items">
		{#key nested_edges}
			<!-- TODO: Could add field_prefix here, but it's hardcoded off for now -->
			<NestedEdgeList
				{plugin}
				{nested_edges}
				field_prefix={false}
				sort={(a, b) => a.target_id.localeCompare(b.target_id)}
				show_node_options={plugin.settings.views.side.tree
					.show_node_options}
			/>
		{/key}
	</div>
</div>
