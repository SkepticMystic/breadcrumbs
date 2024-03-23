<script lang="ts">
	import type { EdgeSortId } from "src/const/graph";
	import { DIRECTIONS } from "src/const/hierarchies";
	import { get_edge_sorter, has_edge_attrs } from "src/graph/utils";
	import type BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import { untyped_pick } from "src/utils/objects";
	import { url_search_params } from "src/utils/url";
	import EdgeLink from "./EdgeLink.svelte";
	import RebuildGraphButton from "./RebuildGraphButton.svelte";
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

<div class="markdown-rendered BC-matrix-view -mt-2">
	<div class="nav-header">
		<div class="nav-buttons-container">
			<RebuildGraphButton
				cls="clickable-icon nav-action-button"
				{plugin}
			/>

			<EdgeSortIdSelector
				cls="clickable-icon nav-action-button"
				exclude_fields={["field", "neighbour-dir:", "neighbour-field:"]}
				bind:edge_sort_id
			/>
		</div>
	</div>

	{#key all_out_edges}
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
									{#key edge_sort_id}
										{#each out_edges.sort(sort) as edge}
											<div class="tree-item">
												<div
													class="tree-item-self is-clickable"
												>
													<EdgeLink
														{edge}
														{plugin}
														cls="grow tree-item-inner"
														show_node_options={plugin
															.settings.views.side
															.matrix
															.show_node_options}
													/>

													<div
														class="tree-item-flair-outer"
													>
														<span
															class="tree-item-flair font-mono"
															aria-label={url_search_params(
																untyped_pick(
																	edge.attr,
																	[
																		"source",
																		"implied_kind",
																		"round",
																	],
																),
															)}
														>
															({edge.attr.explicit
																? "x"
																: "i"})
														</span>
													</div>
												</div>
											</div>
										{/each}
									{/key}
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
