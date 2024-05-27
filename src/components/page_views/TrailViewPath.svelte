<script lang="ts">
	import type BreadcrumbsPlugin from "src/main";
	import EdgeLink from "../EdgeLink.svelte";
	import { NodeStringifyOptions, type Path } from "wasm/pkg/breadcrumbs_graph_wasm";

	export let plugin: BreadcrumbsPlugin;
	export let all_paths: Path[];

	const { dendron_note } = plugin.settings.explicit_edge_sources;

	const show_node_options = plugin.settings.views.page.trail.show_node_options
	const node_stringify_options = new NodeStringifyOptions(
		show_node_options.ext,
		show_node_options.folder,
		show_node_options.alias,
		dendron_note.enabled && dendron_note.display_trimmed
			? dendron_note.delimiter
			: undefined,
	);

	const reversed = all_paths.map((path) => path.reverse_edges);
</script>

<div class="BC-trail-view flex flex-col gap-1 px-3 py-2">
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
						{node_stringify_options}
					/>
				</div>
			{/each}
		</div>
	{/each}
</div>

<style>
	.BC-trail-view {
		overflow: hidden;
		border-radius: var(--radius-m);
		border: 1px solid var(--background-modifier-border);
	}

	.BC-trail-view-item-separator::before {
		content: ">";
	}
</style>
