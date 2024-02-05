<script lang="ts">
	import type { BCEdge } from "src/graph/MyMultiGraph";
	import type BreadcrumbsPlugin from "src/main";
	import EdgeLink from "../EdgeLink.svelte";

	export let plugin: BreadcrumbsPlugin;
	export let all_paths: BCEdge[][];

	const reversed = all_paths.map((path) => [...path].reverse());
</script>

<div class="BC-trail-view flex flex-col gap-1 p-1">
	{#each reversed as path}
		<div class="BC-trail-view-path flex gap-1.5">
			{#each path as edge, j}
				<div class="BC-trail-view-item">
					{#if j !== 0}
						<span
							class="BC-trail-view-item-separator"
							aria-label="{edge.attr.explicit
								? edge.attr.source
								: edge.attr.implied_kind}: {edge.attr.dir}"
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
