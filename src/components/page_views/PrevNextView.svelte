<script lang="ts">
	import { objectify_edge_mapper } from "src/graph/objectify_mappers";
	import BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import { group_by } from "src/utils/arrays";
	import EdgeLink from "../EdgeLink.svelte";

	export let plugin: BreadcrumbsPlugin;

	const grouped_out_edges = $active_file_store
		? group_by(
				plugin.graph
					.mapOutEdges(
						$active_file_store?.path,
						objectify_edge_mapper((e) => e),
					)
					.filter((e) => ["prev", "next"].includes(e.attr.dir)),
				(e) => e.attr.dir,
			)
		: null;
</script>

<div class="BC-prev-next-view flex">
	<div class="flex w-full flex-col">
		{#each grouped_out_edges?.prev ?? [] as edge}
			<div class="BC-next-prev-item flex gap-3 p-1 text-left">
				<span class="BC-field">{edge.attr.field}</span>

				<EdgeLink
					{edge}
					{plugin}
					cls="grow"
					show_node_options={plugin.settings.views.page.prev_next
						.show_node_options}
				/>
			</div>
		{/each}
	</div>

	<div class="flex w-full flex-col">
		{#each grouped_out_edges?.next ?? [] as edge}
			<div class="BC-next-prev-item flex gap-3 p-1 text-right">
				<EdgeLink
					{edge}
					{plugin}
					cls="grow"
					show_node_options={plugin.settings.views.page.prev_next
						.show_node_options}
				/>

				<span class="BC-field">{edge.attr.field}</span>
			</div>
		{/each}
	</div>
</div>

<style>
	.BC-prev-next-view > div {
		border: 1px solid var(--background-modifier-border);
	}

	.BC-next-prev-item {
		border-bottom: 1px solid var(--background-modifier-border);
	}
</style>
