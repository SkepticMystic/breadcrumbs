<script lang="ts">
	import BreadcrumbsPlugin from "src/main";
	import { group_by, remove_duplicates } from "src/utils/arrays";
	import { resolve_field_group_labels } from "src/utils/edge_fields";
	import EdgeLink from "../EdgeLink.svelte";
	import { to_node_stringify_options } from "src/graph/utils";

	interface Props {
		file_path: string;
		plugin: BreadcrumbsPlugin;
	}

	let { file_path, plugin }: Props = $props();

	let edge_field_labels = $derived.by(() => {
		const { field_group_labels } = plugin.settings.views.page.prev_next;
		return {
			prev: resolve_field_group_labels(
				plugin.settings.edge_field_groups,
				field_group_labels.prev,
			),
			next: resolve_field_group_labels(
				plugin.settings.edge_field_groups,
				field_group_labels.next,
			),
		};
	});

	let merged_field_labels = $derived(
		remove_duplicates([
			...edge_field_labels.prev,
			...edge_field_labels.next,
		]),
	);

	let node_stringify_options = $derived(
		to_node_stringify_options(
			plugin.settings,
			plugin.settings.views.page.prev_next.show_node_options,
		),
	);

	let grouped_out_edges = $derived.by(() => {
		if (!plugin.graph.has_node(file_path)) return null;
		const efl = edge_field_labels;
		return group_by(
			plugin.graph
				.get_filtered_outgoing_edges(file_path, merged_field_labels)
				.get_edges(),
			(e) =>
				efl.prev.includes(e.edge_type)
					? ("prev" as const)
					: ("next" as const),
		);
	});
</script>

<div class="BC-prev-next-view flex">
	{#if grouped_out_edges?.prev?.length || grouped_out_edges?.next?.length}
		<div
			class="flex w-full flex-col"
			style="border-radius: var(--radius-m) 0 0 var(--radius-m)"
		>
			{#each grouped_out_edges?.prev ?? [] as edge}
				<div class="BC-next-prev-item flex gap-3 p-1 text-left">
					<span class="BC-field pl-2">{edge.edge_type}</span>

					<EdgeLink
						cls="grow"
						{edge}
						{plugin}
						{node_stringify_options}
					/>
				</div>
			{/each}
		</div>

		<div
			class="flex w-full flex-col"
			style="border-radius:  0 var(--radius-m) var(--radius-m) 0"
		>
			{#each grouped_out_edges?.next ?? [] as edge}
				<div class="BC-next-prev-item flex gap-3 p-1 text-right">
					<EdgeLink
						cls="grow"
						{edge}
						{plugin}
						{node_stringify_options}
					/>

					<span class="BC-field pr-2">{edge.edge_type}</span>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>

	.BC-prev-next-view > div {
		border: 1px solid var(--background-modifier-border);
	}
	.BC-prev-next-view .flex-col {
		background-color: var(--background-primary);
	}
</style>
