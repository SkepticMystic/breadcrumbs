<script lang="ts">
	import { ChevronDown, ChevronRight } from "lucide-svelte";
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

	const opens = nested_edges.map(() => true);
</script>

{#each nested_edges.sort((a, b) => sort(a.edge, b.edge)) as nested, i}
	<details class="tree-item" bind:open={opens[i]}>
		<summary class="tree-item-self is-clickable flex items-center">
			{#if nested.children.length}
				<div class="tree-item-icon collapse-icon">
					{#if opens[i]}
						<ChevronDown size="12" />
					{:else}
						<ChevronRight size="12" />
					{/if}
				</div>
			{/if}

			<div class="flex gap-2">
				{#if field_prefix}
					<span class="BC-field"> {nested.edge.attr.field}</span>
				{/if}

				<EdgeLink
					cls="tree-item-inner"
					{plugin}
					edge={nested.edge}
					{show_node_options}
				/>
			</div>
		</summary>

		{#if nested.children.length}
			<div class="tree-item-children">
				<svelte:self
					{sort}
					{plugin}
					{field_prefix}
					nested_edges={nested.children}
				/>
			</div>
		{/if}
	</details>
{/each}
