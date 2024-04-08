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

	export let plugin: BreadcrumbsPlugin;
	export let options: ICodeblock["Options"];
	export let errors: BreadcrumbsError[];

	const all_paths =
		$active_file_store &&
		// Even tho we ensure the graph is built before the views are registered,
		// Existing views still try render before the graph is built.
		plugin.graph.hasNode($active_file_store.path)
			? plugin.settings.hierarchies
					.map((_hierarchy, hierarchy_i) =>
						Traverse.all_paths(
							"depth_first",
							plugin.graph,
							$active_file_store!.path,
							(e) =>
								has_edge_attrs(e, {
									hierarchy_i,
									dir: options.dir,
									$or_fields: options.fields,
									$or_target_ids: options.dataview_from_paths,
								}),
						),
					)
					.flat()
			: [];

	const sliced = all_paths.map((path) =>
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
		{/if}
	</div>
</div>
