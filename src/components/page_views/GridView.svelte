<script lang="ts">
	import { traverse_graph } from "src/graph/traverse";
	import type BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import {
		ensure_square_array,
		gather_by_runs,
		transpose,
	} from "src/utils/arrays";
	import EdgeLink from "../EdgeLink.svelte";

	export let plugin: BreadcrumbsPlugin;

	const paths = $active_file_store
		? plugin.settings.hierarchies
				.map((_hierarchy, i) =>
					traverse_graph.all_paths(
						traverse_graph.depth_first,
						plugin.graph,
						$active_file_store!.path,
						(edge) =>
							edge.attr.dir === "up" &&
							// Here, we ensure an edge is only considered part of a path if it is from the same hierarchy as the previous edges
							edge.attr.hierarchy_i === i,
					),
				)
				.flat()
				// This basic sorting can break the continuity of the grid-areas.
				// A better solution would sort the rows to maximise run length.
				.sort((a, b) => b.length - a.length)
		: [];

	const reversed = paths.map((path) => [...path].reverse());

	const square = ensure_square_array(reversed, null, true);
	// console.log(
	// 	"pretty square",
	// 	square.map((path) =>
	// 		path.map((e) => (e ? stringify_edge(e, { rtl: true }) : null)),
	// 	),
	// );

	const col_runs = transpose(square).map((col) =>
		gather_by_runs(col, (e) => (e ? e.target_id : null)),
	);

	// console.log(
	// 	"col_runs",
	// 	col_runs.map((run) =>
	// 		run.map(
	// 			(r) =>
	// 				`${r?.value ? Path.keep(r?.value) : r?.value}: ${
	// 					r?.first
	// 				} - ${r?.last}`,
	// 		),
	// 	),
	// );
</script>

<div
	class="markdown-rendered BC-grid-view grid"
	style="grid-template-rows: {'1fr '.repeat(square.length)};
         grid-template-columns: {'1fr '.repeat(square.at(0)?.length ?? 0)};"
>
	{#each col_runs as col, j}
		{#each col as { first, last }}
			{@const edge = square[first][j]}

			<div
				class="BC-grid-view-item flex"
				style="
				grid-area: {first + 1} / {j + 1} / {last + 2} / {j + 2};"
			>
				{#if edge}
					<EdgeLink
						{edge}
						{plugin}
						cls="p-1 grow flex justify-center items-center"
						show_node_options={plugin.settings.views.page.grid
							.show_node_options}
					/>
				{/if}
			</div>
		{/each}
	{/each}
</div>

<style>
	.BC-grid-view-item {
		border: 1px solid var(--background-modifier-border);
	}
</style>
