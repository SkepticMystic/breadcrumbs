<script lang="ts">
	import { ImageIcon, PencilIcon } from "lucide-svelte";
	import type { ICodeblock } from "src/codeblocks/schema";
	import { ICON_SIZE } from "src/const";
	import type { BreadcrumbsError } from "src/interfaces/graph";
	import { log } from "src/logger";
	import type BreadcrumbsPlugin from "src/main";
	import { Mermaid } from "src/utils/mermaid";
	import { onMount } from "svelte";
	import CopyToClipboardButton from "../button/CopyToClipboardButton.svelte";
	import RenderExternalCodeblock from "../obsidian/RenderExternalCodeblock.svelte";
	import CodeblockErrors from "./CodeblockErrors.svelte";
	import {
		MermaidGraphOptions,
		NodeData,
		NoteGraphError,
		TraversalOptions,
	} from "wasm/pkg/breadcrumbs_graph_wasm";
	import { remove_nullish_keys } from "src/utils/objects";
	import { Paths } from "src/utils/paths";
	import { Links } from "src/utils/links";

	export let plugin: BreadcrumbsPlugin;
	export let options: ICodeblock["Options"];
	export let errors: BreadcrumbsError[];
	export let file_path: string;

	const DEFAULT_MAX_DEPTH = 100;

	let code: string = "";
	let error: NoteGraphError | undefined = undefined;

	export const update = () => {
		const max_depth = options.depth[1] ?? DEFAULT_MAX_DEPTH;

		const traversal_options = new TraversalOptions(
			[file_path],
			options.fields,
			max_depth === Infinity ? DEFAULT_MAX_DEPTH : max_depth,
			!options["merge-fields"],
		);

		const flowchart_init = remove_nullish_keys({
			curve: options["mermaid-curve"],
			defaultRenderer: options["mermaid-renderer"],
		});

		const mermaid_options = new MermaidGraphOptions(
			file_path,
			`%%{ init: { "flowchart": ${JSON.stringify(flowchart_init)} } }%%`,
			"graph",
			options["mermaid-direction"] ?? "LR",
			true,
			options["show-attributes"] ?? [],
			(node: NodeData) => {
				const node_path = node.path;
				const file = plugin.app.vault.getFileByPath(node_path);

				if (file) {
					return plugin.app.fileManager
						.generateMarkdownLink(file, file_path)
						.slice(2, -2);
				} else {
					return Paths.drop_ext(
						Links.resolve_to_absolute_path(
							plugin.app,
							node_path,
							file_path,
						),
					);
				}
			},
			true,
		);

		try {
			code = plugin.graph.generate_mermaid_graph(
				traversal_options,
				mermaid_options,
			).mermaid;
			error = undefined;
		} catch (e) {
			log.error("Error generating mermaid graph", e);

			if (e instanceof NoteGraphError) {
				code = "";
				error = e;
			}
		}
	};

	onMount(() => {
		update();
	});

	// TODO(RUST)
	// const sort = get_edge_sorter(
	// 	// @ts-expect-error: ts(2345)
	// 	options.sort,
	// 	plugin.graph,
	// );

	// let traversal_items: TraversalStackItem[] = [];
	// let distances: Map<string, number> = new Map();

	// // if the file_path is an empty string, so the code block is not rendered inside note, we fall back to the active file store
	// $: source_path = file_path
	// 	? file_path
	// 	: $active_file_store
	// 		? $active_file_store.path
	// 		: "";

	// // this is an exposed function that we can call from the outside to update the codeblock
	// export const update = () => {
	// 	traversal_items = get_traversal_items();
	// 	distances = Distance.from_traversal_items(traversal_items);
	// };

	// const base_traversal = (attr: EdgeAttrFilters) =>
	// 	Traverse.gather_items(plugin.graph, source_path, (item) =>
	// 		has_edge_attrs(item.edge, {
	// 			...attr,
	// 			$or_target_ids: options["dataview-from-paths"],
	// 		}),
	// 	);

	// const edge_field_labels =
	// 	options.fields ?? plugin.settings.edge_fields.map((f) => f.label);

	// const get_traversal_items = () => {
	// 	if (source_path && plugin.graph.hasNode(source_path)) {
	// 		return options["merge-fields"]
	// 			? base_traversal({ $or_fields: options.fields })
	// 			: edge_field_labels.flatMap((field) =>
	// 					base_traversal({ field }),
	// 				);
	// 	} else {
	// 		return [];
	// 	}
	// };

	// onMount(update);

	// $: edges = traversal_items
	// 	.filter((item) =>
	// 		is_between(
	// 			distances.get(item.edge.target_id) ?? 0,
	// 			options.depth[0] + 1,
	// 			options.depth[1],
	// 		),
	// 	)
	// 	.map((item) => item.edge)
	// 	.sort(sort);

	// $: mermaid = Mermaid.from_edges(edges, {
	// 	kind: "graph",
	// 	click: { method: "class" },
	// 	active_node_id: source_path,
	// 	renderer: options["mermaid-renderer"],
	// 	direction: options["mermaid-direction"],
	// 	show_attributes: options["show-attributes"],

	// 	get_node_label: (node_id, _attr) => {
	// 		const file = plugin.app.vault.getFileByPath(node_id);

	// 		return file
	// 			? plugin.app.fileManager
	// 					.generateMarkdownLink(file, source_path)
	// 					.slice(2, -2)
	// 			: Paths.drop_ext(
	// 					Links.resolve_to_absolute_path(
	// 						plugin.app,
	// 						node_id,
	// 						source_path,
	// 					),
	// 				);
	// 	},
	// });

	// $: log.debug(mermaid);
</script>

<div class="BC-codeblock-mermaid">
	<CodeblockErrors {plugin} {errors} />

	{#if options.title}
		<h3 class="BC-codeblock-mermaid-title">
			{options.title}
		</h3>
	{/if}

	{#if code}
		<div class="relative">
			<div class="absolute left-2 top-2 flex">
				<CopyToClipboardButton
					text={code}
					cls="clickable-icon nav-action-button"
				/>

				<button
					role="link"
					aria-label="View Image on mermaid.ink"
					class="clickable-icon nav-action-button"
					on:click={() => {
						window.open(Mermaid.to_image_link(code), "_blank");
					}}
				>
					<ImageIcon size={ICON_SIZE} />
				</button>

				<button
					role="link"
					aria-label="Live Edit on mermaid.live"
					class="clickable-icon nav-action-button"
					on:click={() => {
						window.open(Mermaid.to_live_edit_link(code), "_blank");
					}}
				>
					<PencilIcon size={ICON_SIZE} />
				</button>
			</div>

			<RenderExternalCodeblock
				{code}
				{plugin}
				source_path={file_path}
				type="mermaid"
			/>
		</div>
	{:else if error}
		<p class="search-empty-state">{error.message}</p>
	{:else}
		<!-- TODO(HELP-MSG) -->
		<p class="search-empty-state">No paths found.</p>
	{/if}
</div>
