<script lang="ts">
	import type { BCEdge } from "src/graph/MyMultiGraph";
	import type { ShowNodeOptions } from "src/interfaces/settings";
	import type BreadcrumbsPlugin from "src/main";
	import EdgeLink from "./EdgeLink.svelte";
	import type { ICodeblock } from "src/interfaces/codeblocks";
	import type { EdgeSorter } from "src/graph/utils";

	export let plugin: BreadcrumbsPlugin;
	export let show_node_options: ShowNodeOptions;
	export let flat_edges: { edge: BCEdge; depth: number }[] = [];
	export let field_prefix: ICodeblock["Options"]["field_prefix"];

	export let sort: EdgeSorter;
</script>

<ul>
	{#each flat_edges.sort((a, b) => sort(a.edge, b.edge)) as nested}
		<!-- TODO: Possibly flex this for the span -->
		<li>
			{#if field_prefix}
				<span class="BC-field">{nested.edge.attr.field}: </span>
			{/if}

			<EdgeLink {plugin} edge={nested.edge} {show_node_options} />
		</li>
	{/each}
</ul>
