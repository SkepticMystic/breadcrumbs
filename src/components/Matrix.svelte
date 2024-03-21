<script lang="ts">
	import type { EdgeSortId } from "src/const/graph";
	import { DIRECTIONS } from "src/const/hierarchies";
	import { get_edge_sorter, has_edge_attrs } from "src/graph/utils";
	import type BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import EdgeLink from "./EdgeLink.svelte";
	import EdgeSortIdSelector from "./selector/EdgeSortIdSelector.svelte";

	export let plugin: BreadcrumbsPlugin;

	let edge_sort_id: EdgeSortId = { field: "basename", order: 1 };

	$: all_out_edges =
		$active_file_store &&
		// Even tho we ensure the graph is built before the views are registered,
		// Existing views still try render before the graph is built.
		plugin.graph.hasNode($active_file_store.path)
			? plugin.graph.get_out_edges($active_file_store.path)
			: [];

	$: sort = get_edge_sorter(edge_sort_id, plugin.graph);
</script>

<div class="markdown-rendered BC-matrix-view flex flex-col">
	<EdgeSortIdSelector bind:edge_sort_id />

	<!-- TODO: Check if the second condition is necessary -->
	{#key all_out_edges || edge_sort_id}
		{#each plugin.settings.hierarchies as hierarchy, hierarchy_i}
			{@const hierarchy_out_edges = all_out_edges.filter((e) =>
				has_edge_attrs(e, { hierarchy_i }),
			)}

			{#if hierarchy_out_edges.length}
				<div class="BC-matrix-view-hierarchy flex flex-col gap-4">
					{#each DIRECTIONS as dir}
						{@const out_edges = hierarchy_out_edges.filter((e) =>
							has_edge_attrs(e, { dir }),
						)}

						{#if out_edges.length}
							<div class="BC-matrix-view-dir flex flex-col gap-1">
								<span class="text-lg font-semibold">
									{hierarchy.dirs[dir].join(", ")}
								</span>

								<div class="flex flex-col">
									{#each out_edges.sort(sort) as edge}
										<div class="flex justify-between">
											<EdgeLink
												{edge}
												{plugin}
												cls="grow"
												show_node_options={plugin
													.settings.views.side.matrix
													.show_node_options}
											/>

											<code
												aria-label={edge.attr.explicit
													? `source:${edge.attr.source}`
													: `kind:${edge.attr.implied_kind} round:${edge.attr.round}`}
											>
												{edge.attr.explicit ? "x" : "i"}
											</code>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					{/each}
				</div>

				{#if plugin.settings.hierarchies.length !== hierarchy_i + 1}
					<hr class="my-3" />
				{/if}
			{/if}
		{/each}
	{/key}
</div>
