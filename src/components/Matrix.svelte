<script lang="ts">
	import type BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import { drop_ext } from "src/utils/paths";

	export let plugin: BreadcrumbsPlugin;

	$: out_edges =
		$active_file_store &&
		// Even tho we ensure the graph is built before the views are registered,
		// Existing views still try render before the graph is built.
		plugin.graph.hasNode($active_file_store.path)
			? plugin.graph.mapOutEdges(
					$active_file_store.path,
					(_edge_id, attr, _source_id, target_id) => ({
						attr,
						target_id,
					}),
				)
			: [];

	$: console.log("out_edges", out_edges);
</script>

<div class="markdown-rendered">
	{#if out_edges.length}
		<div id="bc-matrix-items">
			{#each out_edges as { attr, target_id }}
				<span>
					{attr.field}:
					<!-- svelte-ignore a11y-click-events-have-key-events -->
					<!-- svelte-ignore a11y-no-static-element-interactions -->
					<span
						class="internal-link"
						on:click={() => {
							plugin.app.workspace.openLinkText(
								target_id,
								$active_file_store?.path ?? "",
							);
						}}
					>
						{drop_ext(target_id)}
					</span>
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
