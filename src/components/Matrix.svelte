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
		// TODO: Hook into the app.vault events to add/remove the nodes/edges
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

<div class="markdown-rendered">
	{#key all_out_edges}
		<div class="flex flex-col">
			{#each plugin.settings.hierarchies as hierarchy, hierarchy_i}
				<div class="flex flex-col gap-4 p-2">
					{#each DIRECTIONS as dir}
						{@const out_edges = all_out_edges.filter(
							(edge) =>
								edge.attr.dir === dir &&
								edge.attr.hierarchy_i === hierarchy_i,
						)}

						<div class="flex flex-col gap-1">
							<span class="text-lg font-semibold">
								{hierarchy.dirs[dir].join(", ")}
							</span>

							<div class="flex flex-col">
								{#each out_edges as edge}
									<div class="flex justify-between">
										<EdgeLink
											{edge}
											{plugin}
											path_keep_options={plugin.settings
												.views.side.matrix
												.path_keep_options}
										/>

										<span
											class="font-mono"
											aria-label={edge.attr.explicit
												? edge.attr.source
												: edge.attr.implied_kind}
										>
											({edge.attr.explicit ? "x" : "i"})
										</span>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>

				<hr />
			{/each}
		</div>
	{/key}
</div>
