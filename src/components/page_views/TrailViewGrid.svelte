<script lang="ts">
	import type { BCEdge } from "src/graph/MyMultiGraph";
	import type BreadcrumbsPlugin from "src/main";
	import {
		ensure_square_array,
		gather_by_runs,
		transpose,
	} from "src/utils/arrays";
	import EdgeLink from "../EdgeLink.svelte";

	export let plugin: BreadcrumbsPlugin;
	export let all_paths: BCEdge[][];

	const reversed = all_paths.map((path) => [...path].reverse());

	const square = ensure_square_array(reversed, null, true);

	const col_runs = transpose(square).map((col) =>
		gather_by_runs(col, (e) => (e ? e.target_id : null)),
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
	.BC-trail-view-item {
		border: 1px solid var(--background-modifier-border);
	}
</style>
