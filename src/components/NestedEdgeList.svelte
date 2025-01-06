<script lang="ts">
	import type { ShowNodeOptions } from "src/interfaces/settings";
	import type BreadcrumbsPlugin from "src/main";
	import EdgeLink from "./EdgeLink.svelte";
	import ChevronOpener from "./button/ChevronOpener.svelte";
	import TreeItemFlair from "./obsidian/TreeItemFlair.svelte";
	import { FlatTraversalData } from "wasm/pkg/breadcrumbs_graph_wasm";
	import { toNodeStringifyOptions, type EdgeAttribute } from "src/graph/utils";

	export let plugin: BreadcrumbsPlugin;

	// export let tree: RecTraversalData[];
	export let data: FlatTraversalData[];
	export let items: Uint32Array;

	export let open_signal: boolean | null;
	export let show_node_options: ShowNodeOptions;
	export let show_attributes: EdgeAttribute[] | undefined;

	let node_stringify_options = toNodeStringifyOptions(plugin, show_node_options);

	let opens = Array(items.length).fill(true);

	$: if (open_signal === true) {
		opens = Array(items.length).fill(true);
		open_signal = null;
	} else if (open_signal === false) {
		opens = Array(items.length).fill(false);
		open_signal = null;
	}

	// $: console.log(opens);
</script>

{#each items as item, i}
	{@const datum = data[item]}
	{@const children = datum.children}
	<details class="tree-item" bind:open={opens[i]}>
		<summary class="tree-item-self is-clickable flex items-center">
			{#if children.length}
				<div class="tree-item-icon collapse-icon mod-collapsible">
					<ChevronOpener open={opens[i]} />
				</div>
			{/if}

			<div class="tree-item-inner">
				<EdgeLink
					{plugin}
					edge={datum.edge}
					{node_stringify_options}
					cls="tree-item-inner-text"
				/>
			</div>

			{#if show_attributes?.length}
				<TreeItemFlair
					label={datum.get_attribute_label(plugin.graph, show_attributes)}
				/>
			{/if}
		</summary>

		{#if children.length}
			<div class="tree-item-children">
				<svelte:self
					{plugin}
					{show_attributes}
					{show_node_options}
					{data}
					items={children}
				/>
			</div>
		{/if}
	</details>
{/each}
