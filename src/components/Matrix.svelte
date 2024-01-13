<script lang="ts">
	import { DIRECTIONS } from "src/const/hierarchies";
	import type BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import ObsidianLink from "./ObsidianLink.svelte";

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

	$: console.log("out_edges", all_out_edges);
</script>

<div class="markdown-rendered">
	{#key all_out_edges}
		<div class="flex flex-col">
			{#each plugin.settings.hierarchies as hierarchy}
				<div class="border flex flex-col gap-4 p-2">
					{#each DIRECTIONS as dir}
						{@const out_edges = all_out_edges.filter(
							(edge) =>
								edge.attr.dir === dir &&
								hierarchy.dirs[dir].includes(edge.attr.field),
						)}

						<div class="flex flex-col gap-1">
							<span class="text-lg font-semibold">
								{hierarchy.dirs[dir].join(", ")}
							</span>

							<div class="flex flex-col">
								{#each out_edges as { attr, target_id, target_attr }}
									<div class="flex justify-between">
										<ObsidianLink
											{plugin}
											path={target_id}
											resolved={target_attr.resolved}
										/>

										<span class="font-mono">
											({attr.explicit ? "x" : "i"})
										</span>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/each}
		</div>
	{/key}
</div>
