<script lang="ts">
	import { MarkdownRenderer } from "obsidian";
	import type { BCEdge } from "src/graph/MyMultiGraph";
	import { Distance } from "src/graph/distance";
	import { Traverse } from "src/graph/traverse";
	import { has_edge_attrs, type EdgeAttrFilters } from "src/graph/utils";
	import type { ICodeblock } from "src/interfaces/codeblocks";
	import type { BreadcrumbsError } from "src/interfaces/graph";
	import { log } from "src/logger";
	import type BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import { remove_duplicates_by } from "src/utils/arrays";
	import { Links } from "src/utils/links";
	import { Mermaid } from "src/utils/mermaid";
	import { Paths } from "src/utils/paths";
	import { wrap_in_codeblock } from "src/utils/strings";
	import { onMount } from "svelte";
	import CodeblockErrors from "./CodeblockErrors.svelte";

	export let plugin: BreadcrumbsPlugin;
	export let options: ICodeblock["Options"];
	export let errors: BreadcrumbsError[];
	export let file_path: string;

	let all_paths: BCEdge[][] = [];
	let distances: Map<string, number> = new Map();

	// if the file_path is an empty string, so the code block is not rendered inside note, we fall back to the active file store
	$: source_path = file_path
		? file_path
		: $active_file_store
			? $active_file_store.path
			: "";

	// TODO: We can take a subgraph matching the edge_filter, then get .edges(), no need for a traversal

	// this is an exposed function that we can call from the outside to update the codeblock
	export const update = () => {
		all_paths = get_all_paths();
		distances = Distance.from_paths(all_paths);

		log.debug("distances", distances);
	};

	const base_traversal = (attr: EdgeAttrFilters) =>
		Traverse.all_paths("depth_first", plugin.graph, source_path, (e) =>
			has_edge_attrs(e, {
				...attr,
				$or_target_ids: options.dataview_from_paths,
			}),
		);

	const get_all_paths = () => {
		if (source_path && plugin.graph.hasNode(source_path)) {
			return options.merge_fields
				? base_traversal({ $or_fields: options.fields })
				: (
						options.fields ??
						plugin.settings.edge_fields.map((f) => f.label)
					).flatMap((field) => base_traversal({ field }));
		} else {
			return [];
		}
	};

	onMount(update);

	// Prioritise closer edges
	$: sorted = all_paths.map((path) =>
		path.slice().sort((a, b) => {
			const a_dist = distances.get(a.target_id) ?? 0;
			const b_dist = distances.get(b.target_id) ?? 0;

			return a_dist - b_dist;
		}),
	);

	$: sliced = sorted.map((path) =>
		path.slice(options.depth[0], options.depth[1]),
	);

	$: flat_unique = remove_duplicates_by(sliced.flat(), (e) => e.id);

	$: mermaid = wrap_in_codeblock(
		Mermaid.from_edges(flat_unique, {
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
		}),
		"mermaid",
	);
	$: log.debug(mermaid);

	let mermaid_element: HTMLElement | undefined;

	// we need to pass both the mermaid string and the target element, so that it re-renders when the mermaid string changes
	// and for the initial render the target element is undefined, so we need to check for that
	const render_mermaid = (
		mermaid_str: string,
		target_el: HTMLElement | undefined,
	) => {
		if (target_el) {
			log.debug("rendering mermaid");

			target_el.empty();

			MarkdownRenderer.render(
				plugin.app,
				mermaid_str,
				target_el,
				source_path,
				plugin,
			);
		}
	};

	$: render_mermaid(mermaid, mermaid_element);
</script>

<div class="BC-codeblock-mermaid">
	<CodeblockErrors {errors} />

	{#if options.title}
		<h3 class="BC-codeblock-mermaid-title">
			{options.title}
		</h3>
	{/if}

	{#if flat_unique.length}
		<!-- TODO: The max-width doesn't actually work. Mermaid suggests you can set the width, but only via CLI?
	https://mermaid.js.org/syntax/flowchart.html#width -->
		<div
			class="BC-codeblock-mermaid-graph"
			style="max-width: var(--file-line-width);"
			bind:this={mermaid_element}
		></div>
	{:else}
		<p class="search-empty-state">No paths found.</p>
	{/if}
</div>
