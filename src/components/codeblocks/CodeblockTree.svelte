<script lang="ts">
	import type { BCEdge } from "src/graph/MyMultiGraph";
	import { Traverse } from "src/graph/traverse";
	import { get_edge_sorter, has_edge_attrs } from "src/graph/utils";
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

	let all_paths: BCEdge[][] = [];

	// if the file_path is an empty string, so the code block is not rendered inside note, we fall back to the active file store
	$: active_file_path = file_path
		? file_path
		: $active_file_store
			? $active_file_store.path
			: "";

	// this is an exposed function that we can call from the outside to update the codeblock
	export const update = () => {
		all_paths = get_all_paths();
	};

	const sort = get_edge_sorter(options.sort, plugin.graph);

	const base_traversal = ({
		$or_fields,
	}: {
		$or_fields: string[] | undefined;
	}) =>
		Traverse.all_paths("depth_first", plugin.graph, active_file_path, (e) =>
			has_edge_attrs(e, {
				$or_fields,
				$or_target_ids: options.dataview_from_paths,
			}),
		);

	const get_all_paths = () => {
		console.log(active_file_path);

		if (active_file_path && plugin.graph.hasNode(active_file_path)) {
			if (options.merge_field_groups) {
				return base_traversal({ $or_fields: undefined });
			} else {
				return [].flat();
			}
		} else {
			return [];
		}
	};

	$: sliced = all_paths.map((path) =>
		path.slice(options.depth[0], options.depth[1]),
	);

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
		{#if sliced.length}
			{#if !options.flat}
				<NestedEdgeList
					{sort}
					{plugin}
					open_signal={!options.collapse}
					show_attributes={options.show_attributes}
					nested_edges={Traverse.nest_all_paths(sliced)}
					show_node_options={plugin.settings.views.codeblocks
						.show_node_options}
				/>
			{:else}
				<FlatEdgeList
					{sort}
					{plugin}
					show_attributes={options.show_attributes}
					flat_edges={Traverse.flatten_all_paths(sliced)}
					show_node_options={plugin.settings.views.codeblocks
						.show_node_options}
				/>
			{/if}
		{:else}
			<p class="search-empty-state">No paths found</p>
		{/if}
	</div>
</div>
