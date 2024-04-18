<script lang="ts">
	import type { EdgeAttribute } from "src/graph/MyMultiGraph";
	import type { TraversalStackItem } from "src/graph/traverse";
	import { type EdgeSorter } from "src/graph/utils";
	import type { ShowNodeOptions } from "src/interfaces/settings";
	import type BreadcrumbsPlugin from "src/main";
	import { untyped_pick } from "src/utils/objects";
	import { url_search_params } from "src/utils/url";
	import EdgeLink from "./EdgeLink.svelte";

	export let plugin: BreadcrumbsPlugin;
	export let show_node_options: ShowNodeOptions;
	export let flat_edges: TraversalStackItem[] = [];
	export let show_attributes: EdgeAttribute[] | undefined;

	export let sort: EdgeSorter;
</script>

<ul>
	{#each flat_edges.sort((a, b) => sort(a.edge, b.edge)) as nested}
		<li class="flex justify-between">
			<EdgeLink {plugin} edge={nested.edge} {show_node_options} />

			{#if show_attributes?.length}
				<div class="tree-item-flair-outer">
					<span class="BC-field tree-item-flair">
						{url_search_params(
							untyped_pick(nested.edge.attr, show_attributes),
							{ trim_lone_param: true },
						)}
					</span>
				</div>
			{/if}
		</li>
	{/each}
</ul>
