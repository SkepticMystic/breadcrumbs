<script lang="ts">
	import type BreadcrumbsPlugin from "src/main";
	import EdgeLink from "../EdgeLink.svelte";
	import type { Path } from "wasm/pkg/breadcrumbs_graph_wasm";

	export let plugin: BreadcrumbsPlugin;
	export let all_paths: Path[];

	const reversed = all_paths.map((path) => path.reverse_edges);
</script>

<div class="BC-trail-view flex flex-col gap-1 p-1">
	{#each reversed as path}
		<div class="BC-trail-view-path flex gap-1.5">
			{#each path as edge, j}
				<div class="BC-trail-view-item">
					{#if j !== 0}
						<span
							class="BC-trail-view-item-separator"
							aria-label={edge.get_attribute_label([
								"source",
								"implied_kind",
								"round",
							])}
						></span>
					{/if}

					<EdgeLink
						{edge}
						{plugin}
						show_node_options={plugin.settings.views.page.trail
							.show_node_options}
					/>
				</div>
			{/each}
		</div>
	{/each}
</div>

<style>
	.BC-trail-view {
		border: 1px solid var(--background-modifier-border);
	}

	.BC-trail-view-item-separator::before {
		content: ">";
	}
</style>
