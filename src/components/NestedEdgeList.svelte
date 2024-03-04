<script lang="ts">
	import type { NestedEdgePath } from "src/graph/traverse";
	import type { EdgeSorter } from "src/graph/utils";
	import type { ICodeblock } from "src/interfaces/codeblocks";
	import type { ShowNodeOptions } from "src/interfaces/settings";
	import type BreadcrumbsPlugin from "src/main";
	import EdgeLink from "./EdgeLink.svelte";

	export let plugin: BreadcrumbsPlugin;
	export let nested_edges: NestedEdgePath[];
	export let show_node_options: ShowNodeOptions;
	export let field_prefix: ICodeblock["Options"]["field_prefix"];

	export let sort: EdgeSorter;
</script>

<ul>
	{#each nested_edges.sort((a, b) => sort(a.edge, b.edge)) as nested}
		<!-- TODO: Possibly flex this for the span -->
		<li>
			{#if field_prefix}
				<span class="BC-field"> {nested.edge.attr.field}</span>
			{/if}

			<EdgeLink {plugin} edge={nested.edge} {show_node_options} />

			{#if nested.children.length}
				<svelte:self
					{sort}
					{plugin}
					{field_prefix}
					nested_edges={nested.children}
				/>
			{/if}
		</li>
	{/each}
</ul>
