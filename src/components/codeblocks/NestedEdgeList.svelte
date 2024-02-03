<script lang="ts">
	import type { NestedEdgePath } from "src/graph/traverse";
	import EdgeLink from "../EdgeLink.svelte";
	import type BreadcrumbsPlugin from "src/main";

	export let plugin: BreadcrumbsPlugin;
	export let nested_edges: NestedEdgePath[];
	export let sort: (a: NestedEdgePath, b: NestedEdgePath) => number;
</script>

<ul>
	{#each nested_edges.sort(sort) as nested}
		<li>
			<EdgeLink
				{plugin}
				edge={nested.edge}
				show_node_options={plugin.settings.commands.list_index
					.default_options.show_node_options}
			/>

			{#if nested.children.length}
				<svelte:self {plugin} {sort} nested_edges={nested.children} />
			{/if}
		</li>
	{/each}
</ul>
