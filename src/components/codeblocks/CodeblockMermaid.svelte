<script lang="ts">
	import { Distance } from "src/graph/distance";
	import { Traverse, type TraversalStackItem } from "src/graph/traverse";
	import {
		get_edge_sorter,
		has_edge_attrs,
		type EdgeAttrFilters,
	} from "src/graph/utils";
	import type { ICodeblock } from "src/interfaces/codeblocks";
	import type { BreadcrumbsError } from "src/interfaces/graph";
	import { log } from "src/logger";
	import type BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import { Links } from "src/utils/links";
	import { Mermaid } from "src/utils/mermaid";
	import { is_between } from "src/utils/numbers";
	import { Paths } from "src/utils/paths";
	import { onMount } from "svelte";
	import MermaidDiagram from "../Mermaid/MermaidDiagram.svelte";
	import CodeblockErrors from "./CodeblockErrors.svelte";

	export let plugin: BreadcrumbsPlugin;
	export let options: ICodeblock["Options"];
	export let errors: BreadcrumbsError[];
	export let file_path: string;

	const sort = get_edge_sorter(options.sort, plugin.graph);

	let traversal_items: TraversalStackItem[] = [];
	let distances: Map<string, number> = new Map();

	// if the file_path is an empty string, so the code block is not rendered inside note, we fall back to the active file store
	$: source_path = file_path
		? file_path
		: $active_file_store
			? $active_file_store.path
			: "";

	// this is an exposed function that we can call from the outside to update the codeblock
	export const update = () => {
		traversal_items = get_traversal_items();
		distances = Distance.from_traversal_items(traversal_items);
	};

	const base_traversal = (attr: EdgeAttrFilters) =>
		Traverse.gather_items(plugin.graph, source_path, (item) =>
			has_edge_attrs(item.edge, {
				...attr,
				$or_target_ids: options.dataview_from_paths,
			}),
		);

	const edge_field_labels =
		options.fields ?? plugin.settings.edge_fields.map((f) => f.label);

	const get_traversal_items = () => {
		if (source_path && plugin.graph.hasNode(source_path)) {
			return options.merge_fields
				? base_traversal({ $or_fields: options.fields })
				: edge_field_labels.flatMap((field) =>
						base_traversal({ field }),
					);
		} else {
			return [];
		}
	};

	onMount(update);

	$: edges = traversal_items
		.filter((item) =>
			is_between(
				distances.get(item.edge.target_id) ?? 0,
				options.depth[0] + 1,
				options.depth[1],
			),
		)
		.map((item) => item.edge)
		.sort(sort);

	$: mermaid = Mermaid.from_edges(edges, {
		kind: "graph",
		click: { method: "class" },
		active_node_id: source_path,
		renderer: options.mermaid_renderer,
		direction: options.mermaid_direction,
		show_attributes: options.show_attributes,

		get_node_label: (node_id, _attr) => {
			const file = plugin.app.vault.getFileByPath(node_id);

			return file
				? plugin.app.fileManager
						.generateMarkdownLink(file, source_path)
						.slice(2, -2)
				: Paths.drop_ext(
						Links.resolve_to_absolute_path(
							plugin.app,
							node_id,
							source_path,
						),
					);
		},
	});

	$: log.debug(mermaid);
</script>

<div class="BC-codeblock-mermaid">
	<CodeblockErrors {errors} />

	{#if options.title}
		<h3 class="BC-codeblock-mermaid-title">
			{options.title}
		</h3>
	{/if}

	{#if traversal_items.length}
		<MermaidDiagram {plugin} {mermaid} {source_path} />
	{:else}
		<p class="search-empty-state">No paths found.</p>
	{/if}
</div>
