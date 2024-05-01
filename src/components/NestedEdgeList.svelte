<script lang="ts">
	import type { EdgeAttribute } from "src/graph/MyMultiGraph";
	import { type EdgeSorter } from "src/graph/utils";
	import type { ShowNodeOptions } from "src/interfaces/settings";
	import type BreadcrumbsPlugin from "src/main";
	import EdgeLink from "./EdgeLink.svelte";
	import ChevronOpener from "./button/ChevronOpener.svelte";
	import TreeItemFlair from "./obsidian/TreeItemFlair.svelte";
	import type { RecTraversalData } from "wasm/pkg/breadcrumbs_graph_wasm";

	export let plugin: BreadcrumbsPlugin;

	export let tree: RecTraversalData[];

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
					label={item.edge.get_attribute_label(show_attributes)}
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
