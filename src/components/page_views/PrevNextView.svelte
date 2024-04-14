<script lang="ts">
	import { has_edge_attrs } from "src/graph/utils";
	import BreadcrumbsPlugin from "src/main";
	import { group_by, remove_duplicates } from "src/utils/arrays";
	import { resolve_field_group_labels } from "src/utils/edge_fields";
	import EdgeLink from "../EdgeLink.svelte";

	export let file_path: string;
	export let plugin: BreadcrumbsPlugin;

	const { field_group_labels, show_node_options } =
		plugin.settings.views.page.prev_next;

	const edge_field_labels = {
		left: resolve_field_group_labels(
			plugin.settings.edge_field_groups,
			field_group_labels.left,
		),
		right: resolve_field_group_labels(
			plugin.settings.edge_field_groups,
			field_group_labels.right,
		),
	};

	const grouped_out_edges = plugin.graph.hasNode(file_path)
		? group_by(
				plugin.graph.get_out_edges(file_path).filter((e) =>
					has_edge_attrs(e, {
						$or_fields: remove_duplicates([
							...edge_field_labels.left,
							...edge_field_labels.right,
						]),
					}),
				),
				(e) =>
					edge_field_labels.left.includes(e.attr.field)
						? ("left" as const)
						: ("right" as const),
			)
		: null;
</script>

<div class="BC-left-right-view flex">
	{#if grouped_out_edges?.left?.length || grouped_out_edges?.right?.length}
		<div class="flex w-full flex-col">
			{#each grouped_out_edges?.left ?? [] as edge}
				<div class="BC-right-left-item flex gap-3 p-1 text-left">
					<span class="BC-field">{edge.attr.field}</span>

					<EdgeLink {edge} {plugin} cls="grow" {show_node_options} />
				</div>
			{/each}
		</div>

		<div class="flex w-full flex-col">
			{#each grouped_out_edges?.right ?? [] as edge}
				<div class="BC-right-left-item flex gap-3 p-1 text-right">
					<EdgeLink {edge} {plugin} cls="grow" {show_node_options} />

					<span class="BC-field">{edge.attr.field}</span>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.BC-left-right-view > div {
		border: 1px solid var(--background-modifier-border);
	}

	.BC-right-left-item {
		border-bottom: 1px solid var(--background-modifier-border);
	}
</style>
