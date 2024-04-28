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
	import NestedEdgeList from "../NestedEdgeList.svelte";
	import CopyToClipboardButton from "../button/CopyToClipboardButton.svelte";
	import CodeblockErrors from "./CodeblockErrors.svelte";
	import type { RecTraversalData } from "wasm/pkg/breadcrumbs_graph_wasm";

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

	let tree: RecTraversalData[] = [];

	export const update = () => {
		tree = plugin.graph.rec_traverse(
			file_path,
			options.fields ?? [],
			options.depth[1] ?? 100,
		);
	};

	onMount(() => {
		update();
	});

	// // if the file_path is an empty string, so the code block is not rendered inside note, we fall back to the active file store
	// $: source_path = file_path
	// 	? file_path
	// 	: $active_file_store
	// 		? $active_file_store.path
	// 		: "";

	// // this is an exposed function that we can call from the outside to update the codeblock
	// export const update = () => {
	// 	tree = get_tree();
	// };

	// const base_traversal = (attr: EdgeAttrFilters) =>
	// 	Traverse.build_tree(
	// 		plugin.graph,
	// 		source_path,
	// 		{ max_depth: options.depth[1] },
	// 		(e) =>
	// 			has_edge_attrs(e, {
	// 				...attr,
	// 				$or_target_ids: options["dataview-from-paths"],
	// 			}),
	// 	);

	// const edge_field_labels =
	// 	options.fields ?? plugin.settings.edge_fields.map((f) => f.label);

	// const get_tree = () => {
	// 	if (source_path && plugin.graph.hasNode(source_path)) {
	// 		const traversal = options["merge-fields"]
	// 			? base_traversal({ $or_fields: options.fields })
	// 			: edge_field_labels.flatMap((field) =>
	// 					base_traversal({ field }),
	// 				);

	// 		// NOTE: The flattening is done here so that:
	// 		// - We can use NestedEdgeList for both modes
	// 		// - ListIndex builds from an EdgeTree[] as well
	// 		return options.flat
	// 			? Traverse.flatten_tree(traversal).map((item) => ({
	// 					depth: 0,
	// 					children: [],
	// 					edge: item.edge,
	// 				}))
	// 			: traversal;
	// 	} else {
	// 		return [];
	// 	}
	// };

	// onMount(update);
</script>

<div class="BC-codeblock-tree">
	<CodeblockErrors {plugin} {errors} />

	{#if options.title}
		<h3 class="BC-codeblock-tree-title">
			{options.title}
		</h3>
	{/if}

	{#if tree.length}
		<div class="BC-codeblock-tree-items relative">
			<div class="absolute bottom-2 right-2 flex">
				<CopyToClipboardButton
					cls="clickable-icon nav-action-button"
					text={ListIndex.edge_tree_to_list_index(tree, {
						...plugin.settings.commands.list_index.default_options,
						show_attributes: options["show-attributes"] ?? [],
					})}
				/>
			</div>

			<!-- NOTE: Padded so that the flair doesn't interfere with the floating buttons -->
			<div class="pr-10">
				<NestedEdgeList
					{sort}
					{tree}
					{plugin}
					{show_node_options}
					open_signal={!options.collapse}
					show_attributes={options["show-attributes"]}
				/>
			</div>
		</div>
	{:else}
		<p class="search-empty-state">No paths found</p>
	{/if}
</div>
