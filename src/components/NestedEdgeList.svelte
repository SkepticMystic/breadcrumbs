<script lang="ts">
	import NestedEdgeList from "./NestedEdgeList.svelte";
	import { run } from "svelte/legacy";

	import type { ShowNodeOptions } from "src/interfaces/settings";
	import type BreadcrumbsPlugin from "src/main";
	import EdgeLink from "./EdgeLink.svelte";
	import ChevronOpener from "./button/ChevronOpener.svelte";
	import TreeItemFlair from "./obsidian/TreeItemFlair.svelte";
	import { FlatTraversalData } from "wasm/pkg/breadcrumbs_graph_wasm";
	import {
		toNodeStringifyOptions,
		type EdgeAttribute,
	} from "src/graph/utils";

	interface Props {
		plugin: BreadcrumbsPlugin;
		// export let tree: RecTraversalData[];
		data: FlatTraversalData[];
		items: Uint32Array;
		open_signal: boolean | null;
		show_node_options: ShowNodeOptions;
		show_attributes: EdgeAttribute[] | undefined;
	}

	let {
		plugin,
		data,
		items,
		open_signal = $bindable(),
		show_node_options,
		show_attributes,
	}: Props = $props();

	let node_stringify_options = toNodeStringifyOptions(
		plugin,
		show_node_options,
	);

	let opens = $state(Array(items.length).fill(true));

	$effect(() => {
		if (open_signal === true) {
			opens = Array(items.length).fill(true);
			open_signal = null;
		} else if (open_signal === false) {
			opens = Array(items.length).fill(false);
			open_signal = null;
		}
	});

	// $: console.log(opens);
</script>

{#each items as item, i}
	{@const datum = data[item]}
	{@const children = datum.children}
	<details class="tree-item" bind:open={opens[i]}>
		<summary class="tree-item-self is-clickable flex items-center">
			{#if children.length || datum.has_cut_of_children}
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
					label={datum.get_attribute_label(
						plugin.graph,
						show_attributes,
					)}
				/>
			{/if}
		</summary>

		{#if children.length}
			<div class="tree-item-children">
				<NestedEdgeList
					{plugin}
					{show_attributes}
					{show_node_options}
					{data}
					{open_signal}
					items={children}
				/>
			</div>
		{/if}

		{#if datum.has_cut_of_children}
			<div class="tree-item-children">
				<details class="tree-item">
					<summary class="tree-item-self flex items-center">
						<div class="tree-item-inner">
							<span>Depth limit reached...</span>
						</div>
					</summary>
				</details>
			</div>
		{/if}
	</details>
{/each}
