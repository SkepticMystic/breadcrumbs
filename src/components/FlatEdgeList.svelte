<script lang="ts">
	import type { BCEdge } from "src/graph/MyMultiGraph";
	import type { EdgeSorter } from "src/interfaces/graph";
	import type { ShowNodeOptions } from "src/interfaces/settings";
	import type BreadcrumbsPlugin from "src/main";
	import EdgeLink from "./EdgeLink.svelte";

	export let plugin: BreadcrumbsPlugin;
	export let flat_edges: { edge: BCEdge; depth: number }[] = [];
	export let show_node_options: ShowNodeOptions;

	export let sort: EdgeSorter;
</script>

<ul>
	{#each flat_edges.sort((a, b) => sort(a.edge, b.edge)) as nested}
		<li>
			<EdgeLink {plugin} edge={nested.edge} {show_node_options} />
		</li>
	{/each}
</ul>
