<script lang="ts">
	import BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import { group_by } from "src/utils/arrays";
	import EdgeLink from "../EdgeLink.svelte";
	import { has_edge_attrs } from "src/graph/utils";

	export let plugin: BreadcrumbsPlugin;

	const grouped_out_edges =
		$active_file_store &&
		// Even tho we ensure the graph is built before the views are registered,
		// Existing views still try render before the graph is built.
		plugin.graph.hasNode($active_file_store.path)
			? group_by(
					plugin.graph
						.get_out_edges($active_file_store.path)
						.filter((e) =>
							has_edge_attrs(e, { $or_dirs: ["prev", "next"] }),
						),
					(e) => e.attr.dir,
				)
			: null;
</script>

<div class="BC-prev-next-view flex">
	{#if grouped_out_edges?.prev?.length || grouped_out_edges?.next?.length}
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
	{/if}
</div>

<style>
	.BC-prev-next-view > div {
		border: 1px solid var(--background-modifier-border);
	}

	.BC-next-prev-item {
		border-bottom: 1px solid var(--background-modifier-border);
	}
</style>
