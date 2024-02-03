<script lang="ts">
	import { Traverse } from "src/graph/traverse";
	import type { ICodeblock } from "src/interfaces/codeblocks";
	import type { BreadcrumbsError, EdgeSorter } from "src/interfaces/graph";
	import type BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import { Paths } from "src/utils/paths";
	import FlatEdgeList from "./FlatEdgeList.svelte";
	import NestedEdgeList from "./NestedEdgeList.svelte";

	export let plugin: BreadcrumbsPlugin;
	export let options: ICodeblock["Options"];
	export let errors: BreadcrumbsError[];

	const all_paths = $active_file_store
		? Traverse.all_paths(
				"depth_first",
				plugin.graph,
				$active_file_store.path,
				(e) =>
					e.attr.dir === options.dir &&
					(!options.dataview_from_paths ||
						options.dataview_from_paths.includes(e.target_id)) &&
					(!options.fields ||
						options.fields.includes(e.attr.field as string)),
			)
		: [];

	const sliced = all_paths.map((path) =>
		// BREAKING: I believe the previous behaviour sliced the end exclusively
		path.slice(options.depth[0], options.depth[1]),
	);

	const sort: EdgeSorter = (() => {
		switch (options.sort_by) {
			case "default": {
				return () => 0;
			}
			case "basename": {
				return (a, b) => {
					const a_basename = Paths.drop_folder(a.target_id);
					const b_basename = Paths.drop_folder(b.target_id);

					return (
						a_basename.localeCompare(b_basename) *
						options.sort_order
					);
				};
			}
		}
	})();
</script>

<div class="BC-codeblock-tree">
	{#if errors.length}
		<h3 class="text-red-500">Breadcrumbs Codeblock Errors</h3>

		<ul class="BC-codeblock-tree-errors">
			{#each errors as error}
				<li>
					<code>{error.message}</code>
				</li>
			{/each}
		</ul>
	{/if}

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
					nested_edges={Traverse.nest_all_paths(sliced)}
				/>
			{:else}
				<FlatEdgeList
					{sort}
					{plugin}
					flat_edges={Traverse.flatten_all_paths(sliced)}
				/>
			{/if}
		{/if}
	</div>
</div>
