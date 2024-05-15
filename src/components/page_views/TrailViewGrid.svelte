<script lang="ts">
	import type BreadcrumbsPlugin from "src/main";
	import {
		ensure_square_array,
		gather_by_runs,
		transpose,
	} from "src/utils/arrays";
	import EdgeLink from "../EdgeLink.svelte";
	import type { Path } from "wasm/pkg/breadcrumbs_graph_wasm";

	export let plugin: BreadcrumbsPlugin;
	export let all_paths: Path[];

	const reversed = all_paths.map((path) => path.reverse_edges);

	// this should happen in wasm
	const square = ensure_square_array(reversed, null, true);

	// this as well
	const col_runs = transpose(square).map((col) =>
		gather_by_runs(col, (e) => (e ? e.target_path : null)),
	);
</script>

<!-- TODO: sailKite says using grid-template-rows: subgrid could work some magic here
			https://discord.com/channels/686053708261228577/702656734631821413/1234871810185629859 -->
<div
	class="BC-trail-view grid"
	style="grid-template-rows: min-content;
grid-template-columns: {'1fr '.repeat(square.at(0)?.length ?? 0)};"
>
	{#each col_runs as col, j}
		{#each col as { first, last }}
			{@const edge = square[first][j]}

			<div
				class="BC-trail-view-item flex"
				style="
					grid-area: {first + 1} / {j + 1} / {last + 2} / {j + 2};"
			>
				{#if edge}
					<EdgeLink
						{edge}
						{plugin}
						cls="p-1 grow flex justify-center items-center"
						show_node_options={plugin.settings.views.page.trail
							.show_node_options}
					/>
				{/if}
			</div>
		{/each}
	{/each}
</div>

<style>
	/* Handles the outer border, with some rounding */
	.BC-trail-view {
		/* Don't let the inner cell borders overlow */
		overflow: hidden;
		border-radius: var(--radius-m);
		border: 1px solid var(--background-modifier-border);
	}

	.BC-trail-view-item {
		/* Undo the effect of the double border on the top and right side */
		margin: -1px -1px 0 0;
		/* Only add borders on the top and right sides, to avoid inner duplications, and some outer duplicates */
		border-right: 1px solid var(--background-modifier-border);
		border-top: 1px solid var(--background-modifier-border);
	}
</style>
