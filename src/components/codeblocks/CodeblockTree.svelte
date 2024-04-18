<script lang="ts">
	import { Traverse, type EdgeTree } from "src/graph/traverse";
	import {
		get_edge_sorter,
		has_edge_attrs,
		type EdgeAttrFilters,
	} from "src/graph/utils";
	import type { ICodeblock } from "src/interfaces/codeblocks";
	import type { BreadcrumbsError } from "src/interfaces/graph";
	import type BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import { onMount } from "svelte";
	import FlatEdgeList from "../FlatEdgeList.svelte";
	import NestedEdgeList from "../NestedEdgeList.svelte";
	import CodeblockErrors from "./CodeblockErrors.svelte";

	export let plugin: BreadcrumbsPlugin;
	export let options: ICodeblock["Options"];
	export let errors: BreadcrumbsError[];
	export let file_path: string;

	const sort = get_edge_sorter(options.sort, plugin.graph);
	const { show_node_options } = plugin.settings.views.codeblocks;

	let tree: EdgeTree[] = [];

	// if the file_path is an empty string, so the code block is not rendered inside note, we fall back to the active file store
	$: source_path = file_path
		? file_path
		: $active_file_store
			? $active_file_store.path
			: "";

	// this is an exposed function that we can call from the outside to update the codeblock
	export const update = () => {
		tree = get_tree();
	};

	const base_traversal = (attr: EdgeAttrFilters) =>
		Traverse.build_tree(
			plugin.graph,
			source_path,
			{ max_depth: options.depth[1] },
			(e) =>
				has_edge_attrs(e, {
					...attr,
					$or_target_ids: options.dataview_from_paths,
				}),
		);

	const edge_field_labels =
		options.fields ?? plugin.settings.edge_fields.map((f) => f.label);

	const get_tree = () => {
		if (source_path && plugin.graph.hasNode(source_path)) {
			return options.merge_fields
				? base_traversal({ $or_fields: options.fields })
				: edge_field_labels.flatMap((field) =>
						base_traversal({ field }),
					);
		} else {
			return [];
		}
	};

	onMount(update);
</script>

<div class="BC-codeblock-tree">
	<CodeblockErrors {errors} />

	{#if options.title}
		<h3 class="BC-codeblock-tree-title">
			{options.title}
		</h3>
	{/if}

	<div class="BC-codeblock-tree-items">
		{#if tree.length}
			{#if !options.flat}
				<NestedEdgeList
					{sort}
					{tree}
					{plugin}
					{show_node_options}
					open_signal={!options.collapse}
					show_attributes={options.show_attributes}
				/>
			{:else}
				<FlatEdgeList
					{sort}
					{plugin}
					{show_node_options}
					flat_edges={Traverse.flatten_tree(tree)}
					show_attributes={options.show_attributes}
				/>
			{/if}
		{:else}
			<p class="search-empty-state">No paths found</p>
		{/if}
	</div>
</div>
