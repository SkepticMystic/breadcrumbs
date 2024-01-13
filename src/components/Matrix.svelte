<script lang="ts">
	import type BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import ObsidianLink from "./ObsidianLink.svelte";

	export let plugin: BreadcrumbsPlugin;

	$: out_edges =
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
					) => ({
						attr,
						target_id,
						target_attr,
					}),
				)
			: [];

	$: console.log("out_edges", out_edges);
</script>

<div class="markdown-rendered">
	{#if out_edges.length}
		<div id="bc-matrix-items">
			{#each out_edges as { attr, target_id, target_attr }}
				<span>
					<span class="font-semibold">{attr.field}</span>:
					<ObsidianLink
						{plugin}
						path={target_id}
						resolved={target_attr.resolved}
					/>
					{attr.explicit ? "real" : "implied"}
				</span>
			{/each}
		</div>
	{:else}
		<div>no out_edges</div>
	{/if}
</div>

<style>
	#bc-matrix-items {
		display: flex;
		flex-direction: column;
	}
</style>
