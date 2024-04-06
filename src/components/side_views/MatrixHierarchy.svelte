<script lang="ts">
	import { DIRECTIONS } from "src/const/hierarchies";
	import { type BCEdge, type EdgeAttribute } from "src/graph/MyMultiGraph";
	import { has_edge_attrs, type EdgeSorter } from "src/graph/utils";
	import type { Hierarchy } from "src/interfaces/hierarchies";
	import type BreadcrumbsPlugin from "src/main";
	import MatrixDirection from "./MatrixDirection.svelte";

	export let hierarchy: Hierarchy;
	export let plugin: BreadcrumbsPlugin;
	export let hierarchy_out_edges: BCEdge[];
	export let show_attributes: EdgeAttribute[];

	export let sort: EdgeSorter;
</script>

<div class="BC-matrix-view-hierarchy flex flex-col gap-2">
	{#each DIRECTIONS as dir}
		{@const dir_out_edges = hierarchy_out_edges.filter((e) =>
			has_edge_attrs(e, { dir }),
		)}

		{#if dir_out_edges.length}
			<MatrixDirection
				{dir}
				{plugin}
				{hierarchy}
				{dir_out_edges}
				{show_attributes}
				{sort}
			/>
		{/if}
	{/each}
</div>
