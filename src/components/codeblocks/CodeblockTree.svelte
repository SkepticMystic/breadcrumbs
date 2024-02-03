<script lang="ts">
	import { Traverse } from "src/graph/traverse";
	import type { ICodeblock } from "src/interfaces/codeblocks";
	import type { BreadcrumbsError } from "src/interfaces/graph";
	import type BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import NestedEdgeList from "./NestedEdgeList.svelte";

	export let plugin: BreadcrumbsPlugin;
	export let options: ICodeblock["Options"];
	export let errors: BreadcrumbsError[];

	const nested_edges = $active_file_store
		? Traverse.nest_all_paths(
				Traverse.all_paths(
					"depth_first",
					plugin.graph,
					$active_file_store.path,
					(e) =>
						e.attr.dir === options.dir &&
						(!options.fields ||
							options.fields.includes(e.attr.field as string)),
				),
			)
		: [];

	// TODO: depth
	console.log(nested_edges);
</script>

<div class="BC-codeblock-tree">
	{#if errors.length}
		<h3 class="text-red-500">Breadcrumbs Codeblock Errors</h3>

		<ul class="BC-codeblock-tree-errors">
			{#each errors as error}
				<li>
					<span>{error.message}</span>
				</li>
			{/each}
		</ul>
	{/if}

	{#if nested_edges.length}
		<div class="BC-codeblock-tree-items">
			<h3>
				<!-- TODO: title -->
			</h3>

			<NestedEdgeList
				{plugin}
				{nested_edges}
				sort={(a, b) =>
					b.edge.target_id.localeCompare(a.edge.target_id)}
			/>
		</div>
	{/if}
</div>
