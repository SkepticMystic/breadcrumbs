<script lang="ts">
	import type { NestedEdgePath } from "src/graph/traverse";
	import { type EdgeSorter } from "src/graph/utils";
	import type { ICodeblock } from "src/interfaces/codeblocks";
	import type { ShowNodeOptions } from "src/interfaces/settings";
	import type BreadcrumbsPlugin from "src/main";
	import { untyped_pick } from "src/utils/objects";
	import { url_search_params } from "src/utils/url";
	import ChevronOpener from "./ChevronOpener.svelte";
	import EdgeLink from "./EdgeLink.svelte";

	export let plugin: BreadcrumbsPlugin;
	export let nested_edges: NestedEdgePath[];
	export let show_node_options: ShowNodeOptions;
	export let show_attributes: ICodeblock["Options"]["show_attributes"];

	export let sort: EdgeSorter;

	const opens = nested_edges.map(() => true);
</script>

{#each nested_edges.sort((a, b) => sort(a.edge, b.edge)) as nested, i}
	<details class="tree-item" bind:open={opens[i]}>
		<summary class="tree-item-self is-clickable flex items-center">
			{#if nested.children.length}
				<div class="tree-item-icon collapse-icon mod-collapsible">
					<ChevronOpener open={opens[i]} />
				</div>
			{/if}

			<div class="tree-item-inner">
				<EdgeLink
					cls="tree-item-inner-text"
					{plugin}
					edge={nested.edge}
					{show_node_options}
				/>
			</div>

			{#if show_attributes?.length}
				<div class="tree-item-flair-outer">
					<span class="tree-item-flair">
						{url_search_params(
							untyped_pick(nested.edge.attr, show_attributes),
						)}
					</span>
				</div>
			{/if}
		</summary>

		{#if nested.children.length}
			<div class="tree-item-children">
				<svelte:self
					{sort}
					{plugin}
					{show_attributes}
					nested_edges={nested.children}
				/>
			</div>
		{/if}
	</details>
{/each}
