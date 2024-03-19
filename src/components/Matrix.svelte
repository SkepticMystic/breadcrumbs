<script lang="ts">
	import { DIRECTIONS } from "src/const/hierarchies";
	import type BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import EdgeLink from "./EdgeLink.svelte";

	export let plugin: BreadcrumbsPlugin;

	$: all_out_edges =
		$active_file_store &&
		// Even tho we ensure the graph is built before the views are registered,
		// Existing views still try render before the graph is built.
		plugin.graph.hasNode($active_file_store.path)
			? plugin.graph.mapOutEdges(
					$active_file_store.path,
					(
						_edge_id,
						attr,
						_source_id,
						target_id,
						_source_attr,
						target_attr,
					) => ({ attr, target_id, target_attr }),
				)
			: [];
</script>

<div class="markdown-rendered BC-matrix-view flex flex-col">
	<!-- TODO: Add EdgeSortIdSelector to change sort order on the fly (related #407) -->

	{#key all_out_edges}
		{#each plugin.settings.hierarchies as hierarchy, hierarchy_i}
			{@const hierarchy_out_edges = all_out_edges.filter(
				(edge) => edge.attr.hierarchy_i === hierarchy_i,
			)}

			{#if hierarchy_out_edges.length}
				<div class="BC-matrix-view-hierarchy flex flex-col gap-4">
					{#each DIRECTIONS as dir}
						{@const out_edges = hierarchy_out_edges.filter(
							(edge) => edge.attr.dir === dir,
						)}

						{#if out_edges.length}
							<div class="BC-matrix-view-dir flex flex-col gap-1">
								<span class="text-lg font-semibold">
									{hierarchy.dirs[dir].join(", ")}
								</span>

								<div class="flex flex-col">
									{#each out_edges as edge}
										<div class="flex justify-between">
											<EdgeLink
												{edge}
												{plugin}
												cls="grow"
												show_node_options={plugin
													.settings.views.side.matrix
													.show_node_options}
											/>

											<span
												class="font-mono"
												aria-label={edge.attr.explicit
													? `source:${edge.attr.source}`
													: `kind:${edge.attr.implied_kind} round:${edge.attr.round}`}
											>
												({edge.attr.explicit
													? "x"
													: "i"})
											</span>
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
