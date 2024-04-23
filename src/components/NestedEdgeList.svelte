<script lang="ts">
	import type { EdgeAttribute } from "src/graph/MyMultiGraph";
	import type { EdgeTree } from "src/graph/traverse";
	import { type EdgeSorter } from "src/graph/utils";
	import type { ShowNodeOptions } from "src/interfaces/settings";
	import type BreadcrumbsPlugin from "src/main";
	import { untyped_pick } from "src/utils/objects";
	import { url_search_params } from "src/utils/url";
	import EdgeLink from "./EdgeLink.svelte";
	import ChevronOpener from "./button/ChevronOpener.svelte";
	import TreeItemFlair from "./obsidian/TreeItemFlair.svelte";

	export let plugin: BreadcrumbsPlugin;

	export let tree: EdgeTree[];

	export let open_signal: boolean | null;
	export let show_node_options: ShowNodeOptions;
	export let show_attributes: EdgeAttribute[] | undefined;

	export let sort: EdgeSorter;

	let opens = tree.map(() => true);

	$: if (open_signal === true) {
		opens = opens.map(() => true);
		open_signal = null;
	} else if (open_signal === false) {
		opens = opens.map(() => false);
		open_signal = null;
	}
</script>

{#each tree.sort((a, b) => sort(a.edge, b.edge)) as item, i}
	<details class="tree-item" bind:open={opens[i]}>
		<summary class="tree-item-self is-clickable flex items-center">
			{#if item.children.length}
				<div class="tree-item-icon collapse-icon mod-collapsible">
					<ChevronOpener open={opens[i]} />
				</div>
			{/if}

			<div class="tree-item-inner">
				<EdgeLink
					{plugin}
					edge={item.edge}
					{show_node_options}
					cls="tree-item-inner-text"
				/>
			</div>

			{#if show_attributes?.length}
				<TreeItemFlair
					label={url_search_params(
						untyped_pick(item.edge.attr, show_attributes),
						{ trim_lone_param: true },
					)}
				/>
			{/if}
		</summary>

		{#if item.children.length}
			<div class="tree-item-children">
				<svelte:self
					{sort}
					{plugin}
					{show_attributes}
					{show_node_options}
					tree={item.children}
				/>
			</div>
		{/if}
	</details>
{/each}
