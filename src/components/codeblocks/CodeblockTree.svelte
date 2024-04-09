<script lang="ts">
	import { Traverse } from "src/graph/traverse";
	import { get_edge_sorter, has_edge_attrs } from "src/graph/utils";
	import type { ICodeblock } from "src/interfaces/codeblocks";
	import type { BreadcrumbsError } from "src/interfaces/graph";
	import type BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import FlatEdgeList from "../FlatEdgeList.svelte";
	import NestedEdgeList from "../NestedEdgeList.svelte";
	import CodeblockErrors from "./CodeblockErrors.svelte";
	import type { BCEdge } from "src/graph/MyMultiGraph";

	export let plugin: BreadcrumbsPlugin;
	export let options: ICodeblock["Options"];
	export let errors: BreadcrumbsError[];

	// this is an exposed function that we can call from the outside to update the codeblock
	export const update = () => {
		all_paths = get_all_paths();
	}

	const base_traversal = ({
		hierarchy_i,
	}: {
		hierarchy_i: number | undefined;
	}) =>
		Traverse.all_paths(
			"depth_first",
			plugin.graph,
			$active_file_store!.path,
			(e) =>
				has_edge_attrs(e, {
					hierarchy_i,
					$or_dirs: options.dirs,
					$or_fields: options.fields,
					$or_target_ids: options.dataview_from_paths,
				}),
		);

	const get_all_paths = () => {
		if ($active_file_store && plugin.graph.hasNode($active_file_store.path)) {
			if (options.merge_hierarchies) {
				return base_traversal({ hierarchy_i: undefined });
			} else {
				return plugin.settings.hierarchies
					.map((_hierarchy, hierarchy_i) =>
						base_traversal({ hierarchy_i })
					)
					.flat();
			}
		} else {
			return [];
		}
	}

	let all_paths = get_all_paths();

	let sliced: BCEdge[][];
	$: sliced = all_paths.map((path) =>
		path.slice(options.depth[0], options.depth[1]),
	);

	const sort = get_edge_sorter(options.sort, plugin.graph);
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
