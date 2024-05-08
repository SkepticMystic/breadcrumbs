<script lang="ts">
	import type { ICodeblock } from "src/codeblocks/schema";
	import { ListIndex } from "src/commands/list_index";
	import type { BreadcrumbsError } from "src/interfaces/graph";
	import { log } from "src/logger";
	import type BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import { Timer } from "src/utils/timer";
	import { onMount } from "svelte";
	import {
		NoteGraphError,
		RecTraversalResult,
		TraversalOptions,
		create_edge_sorter,
	} from "wasm/pkg/breadcrumbs_graph_wasm";
	import NestedEdgeList from "../NestedEdgeList.svelte";
	import CopyToClipboardButton from "../button/CopyToClipboardButton.svelte";
	import CodeblockErrors from "./CodeblockErrors.svelte";

	export let plugin: BreadcrumbsPlugin;
	export let options: ICodeblock["Options"];
	export let errors: BreadcrumbsError[];
	export let file_path: string;

	const sort = create_edge_sorter(
		options.sort.field,
		options.sort.order === -1,
	);
	const { show_node_options } = plugin.settings.views.codeblocks;

	const DEFAULT_MAX_DEPTH = 100;

	let tree: RecTraversalResult | undefined = undefined;
	let error: NoteGraphError | undefined = undefined;

	export const update = () => {
		const max_depth = options.depth[1] ?? DEFAULT_MAX_DEPTH;

		const source_path = file_path
			? file_path
			: $active_file_store
				? $active_file_store.path
				: "";

		const traversal_options = new TraversalOptions(
			[source_path],
			options.fields,
			max_depth === Infinity ? DEFAULT_MAX_DEPTH : max_depth,
			!options["merge-fields"],
		);

		try {
			tree = plugin.graph.rec_traverse(traversal_options);
			tree.sort(plugin.graph, sort);

			error = undefined;
		} catch (e) {
			log.error("Error updating codeblock tree", e);
			if (e instanceof NoteGraphError) {
				tree = undefined;
				error = e;
			}
		}
	};

	onMount(() => {
		const timer = new Timer();

		update();

		log.debug(timer.elapsedMessage("CodeblockTree initial traversal"));
	});

	// TODO(RUST): reimplement all this logic

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
</script>

<div class="BC-codeblock-tree">
	<CodeblockErrors {plugin} {errors} />

	{#if options.title}
		<h3 class="BC-codeblock-tree-title">
			{options.title}
		</h3>
	{/if}

	{#if tree && !tree.is_empty()}
		<div class="BC-codeblock-tree-items relative">
			<div class="absolute bottom-2 right-2 flex">
				<CopyToClipboardButton
					cls="clickable-icon nav-action-button"
					text={ListIndex.edge_tree_to_list_index(tree.data, {
						...plugin.settings.commands.list_index.default_options,
						show_attributes: options["show-attributes"] ?? [],
					})}
				/>
			</div>

			<!-- NOTE: Padded so that the flair doesn't interfere with the floating buttons -->
			<div class="pr-10">
				<NestedEdgeList
					tree={tree.data}
					{plugin}
					{show_node_options}
					open_signal={!options.collapse}
					show_attributes={options["show-attributes"]}
				/>
			</div>
		</div>
	{:else if error}
		<p class="search-empty-state">{error.message}</p>
	{:else}
		<!-- TODO(HELP-MSG) -->
		<p class="search-empty-state">No paths found.</p>
	{/if}
</div>
