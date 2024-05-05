<script lang="ts">
	import type { ICodeblock } from "src/codeblocks/schema";
	import { ListIndex } from "src/commands/list_index";
	import { Traverse, type EdgeTree } from "src/graph/traverse";
	import {
		get_edge_sorter,
		has_edge_attrs,
		type EdgeAttrFilters,
	} from "src/graph/utils";
	import type { BreadcrumbsError } from "src/interfaces/graph";
	import type BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import { onMount } from "svelte";
	import CopyToClipboardButton from "../button/CopyToClipboardButton.svelte";
	import RenderExternalCodeblock from "../obsidian/RenderExternalCodeblock.svelte";
	import CodeblockErrors from "./CodeblockErrors.svelte";

	export let plugin: BreadcrumbsPlugin;
	export let options: ICodeblock["Options"];
	export let errors: BreadcrumbsError[];
	export let file_path: string;

	const sort = get_edge_sorter(
		// @ts-expect-error: ts(2345)
		options.sort,
		plugin.graph,
	);
	const { show_node_options } = plugin.settings.views.codeblocks;

	let tree: EdgeTree[] = [];

	// if the file_path is an empty string, so the code block is not rendered inside note, we fall back to the active file store
	$: source_path = file_path
		? file_path
		: $active_file_store
			? $active_file_store.path
			: "";

	// this is an exposed function that we can call from the outside to update the codeblock
	export const update = () => {
		tree = Traverse.sort_edge_tree(get_tree(), sort);
	};

	const base_traversal = (attr: EdgeAttrFilters) =>
		Traverse.build_tree(
			plugin.graph,
			source_path,
			{ max_depth: options.depth[1] },
			(e) =>
				has_edge_attrs(e, {
					...attr,
					$or_target_ids: options["dataview-from-paths"],
				}),
		);

	const edge_field_labels =
		options.fields ?? plugin.settings.edge_fields.map((f) => f.label);

	const get_tree = () => {
		if (source_path && plugin.graph.hasNode(source_path)) {
			const traversal = options["merge-fields"]
				? base_traversal({ $or_fields: options.fields })
				: edge_field_labels.flatMap((field) =>
						base_traversal({ field }),
					);

			// NOTE: The flattening is done here so that:
			// - We can use NestedEdgeList for both modes
			// - ListIndex builds from an EdgeTree[] as well
			return options.flat
				? Traverse.flatten_tree(traversal).map((item) => ({
						depth: 0,
						children: [],
						edge: item.edge,
					}))
				: traversal;
		} else {
			return [];
		}
	};

	$: code = ListIndex.edge_tree_to_list_index(tree, {
		...plugin.settings.commands.list_index.default_options,
		show_node_options,
		show_attributes: options["show-attributes"] ?? [],
	});

	onMount(update);
</script>

<div class="BC-codeblock-markmap">
	<CodeblockErrors {plugin} {errors} />

	{#if options.title}
		<h3 class="BC-codeblock-markmap-title">
			{options.title}
		</h3>
	{/if}

	{#if tree.length}
		<div class="relative">
			<div class="absolute left-2 top-2 flex">
				<CopyToClipboardButton
					text={code}
					cls="clickable-icon nav-action-button"
				/>
			</div>

			<RenderExternalCodeblock
				{code}
				{plugin}
				{source_path}
				type="markmap"
			/>
		</div>
	{:else}
		<!-- TODO(HELP-MSG) -->
		<p class="search-empty-state">No paths found.</p>
	{/if}
</div>
