<script lang="ts">
	import type { NestedEdgePath } from "src/graph/traverse";
	import EdgeLink from "./EdgeLink.svelte";
	import type BreadcrumbsPlugin from "src/main";
	import type { EdgeSorter } from "src/interfaces/graph";
	import type { ShowNodeOptions } from "src/interfaces/settings";

	export let plugin: BreadcrumbsPlugin;
	export let nested_edges: NestedEdgePath[];
	export let show_node_options: ShowNodeOptions;

	export let sort: EdgeSorter;
</script>

<ul>
	{#each nested_edges.sort((a, b) => sort(a.edge, b.edge)) as nested}
		<li>
			<EdgeLink {plugin} edge={nested.edge} {show_node_options} />

			{#if nested.children.length}
				<svelte:self {plugin} {sort} nested_edges={nested.children} />
			{/if}
		</li>
	{/each}
</ul>
