<script lang="ts">
	import ObsidianLink from "src/components/ObsidianLink.svelte";
	import { traverse_graph } from "src/graph/traverse";
	import { stringify_edge } from "src/graph/utils";
	import type BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";

	export let plugin: BreadcrumbsPlugin;

	const paths = $active_file_store
		? traverse_graph.get_traversal_paths(
				traverse_graph.depth_first,
				plugin.graph,
				$active_file_store.path,
				(e) => e.attr.dir === "up",
			)
		: [];

	console.log(
		"pretty paths",
		paths.map((path) => path.map((edge) => stringify_edge(edge))),
	);

	// const square = ensure_square_array(paths_upwards, null, true);
	// console.log("square", square);

	// const transposed = transpose(square);
	// console.log("transposed", transposed);

	const reversed = paths.map((path) => [...path].reverse());
	console.log("reversed", reversed);
</script>

<div
	class="grid"
	style="grid-template-rows: {'1fr '.repeat(paths.length)};
         grid-template-columns: {'1fr '.repeat(paths[0].length)};"
>
	{#each reversed as row}
		{#each row as edge, j}
			{#if edge}
				<div class="grid-item">
					{#if edge}
						<ObsidianLink
							{plugin}
							path={edge.target_id}
							resolved={edge.target_attr.resolved}
						/>
					{/if}
				</div>
			{/if}
		{/each}
	{/each}
</div>
