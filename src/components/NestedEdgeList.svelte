<script lang="ts">
	import type { EdgeAttribute } from "src/graph/MyMultiGraph";
	import type { NestedEdgePath } from "src/graph/traverse";
	import { type EdgeSorter } from "src/graph/utils";
	import type { ShowNodeOptions } from "src/interfaces/settings";
	import type BreadcrumbsPlugin from "src/main";
	import { untyped_pick } from "src/utils/objects";
	import { url_search_params } from "src/utils/url";
	import EdgeLink from "./EdgeLink.svelte";
	import ChevronOpener from "./button/ChevronOpener.svelte";

	export let plugin: BreadcrumbsPlugin;
	export let nested_edges: NestedEdgePath[];
	export let show_node_options: ShowNodeOptions;
	export let show_attributes: EdgeAttribute[] | undefined;
	export let open_signal: boolean | null;
	export let sort: EdgeSorter;

	let opens = nested_edges.map(() => true);

	$: if (open_signal === true) {
		opens = nested_edges.map(() => true);
		open_signal = null;
	} else if (open_signal === false) {
		opens = nested_edges.map(() => false);
		open_signal = null;
	}
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
							{ trim_lone_param: true },
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
