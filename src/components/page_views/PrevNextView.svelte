<script lang="ts">
	import BreadcrumbsPlugin from "src/main";
	import { group_by, remove_duplicates } from "src/utils/arrays";
	import { resolve_field_group_labels } from "src/utils/edge_fields";
	import EdgeLink from "../EdgeLink.svelte";
	import { to_node_stringify_options } from "src/graph/utils";
	import { log } from "src/logger";

	interface Props {
		file_path: string;
		plugin: BreadcrumbsPlugin;
	}

	let { file_path, plugin }: Props = $props();

	const { field_group_labels, show_node_options } =
		plugin.settings.views.page.prev_next;

	let node_stringify_options = to_node_stringify_options(
		plugin.settings,
		show_node_options,
	);

	const edge_field_labels = {
		prev: resolve_field_group_labels(
			plugin.settings.edge_field_groups,
			field_group_labels.prev,
		),
		next: resolve_field_group_labels(
			plugin.settings.edge_field_groups,
			field_group_labels.next,
		),
	};

	const merged_field_labels = remove_duplicates([
		...edge_field_labels.prev,
		...edge_field_labels.next,
	]);

	const grouped_out_edges = plugin.graph.has_node(file_path)
		? group_by(
				plugin.graph
					.get_filtered_outgoing_edges(file_path, merged_field_labels)
					.get_edges(),
				(e) =>
					edge_field_labels.prev.includes(e.edge_type)
						? ("prev" as const)
						: ("next" as const),
			)
		: null;
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
