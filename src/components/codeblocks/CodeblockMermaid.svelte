<script lang="ts">
	import { MarkdownRenderer } from "obsidian";
	import { Traverse } from "src/graph/traverse";
	import { get_edge_sorter, has_edge_attrs } from "src/graph/utils";
	import type { ICodeblock } from "src/interfaces/codeblocks";
	import type { BreadcrumbsError } from "src/interfaces/graph";
	import { log } from "src/logger";
	import type BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import { remove_duplicates_by } from "src/utils/arrays";
	import { Mermaid } from "src/utils/mermaid";
	import { wrap_in_codeblock } from "src/utils/strings";
	import CodeblockErrors from "./CodeblockErrors.svelte";

	export let plugin: BreadcrumbsPlugin;
	export let options: ICodeblock["Options"];
	export let errors: BreadcrumbsError[];

	const all_paths =
		$active_file_store && plugin.graph.hasNode($active_file_store.path)
			? plugin.settings.hierarchies
					.map((_hierarchy, hierarchy_i) =>
						Traverse.all_paths(
							"depth_first",
							plugin.graph,
							$active_file_store!.path,
							(e) =>
								has_edge_attrs(e, {
									hierarchy_i,
									dir: options.dir,
									$or_fields: options.fields,
									$or_target_ids: options.dataview_from_paths,
								}),
						),
					)
					.flat()
			: [];

	const sliced = all_paths.map((path) =>
		path.slice(options.depth[0], options.depth[1]),
	);

	const flat_unique = remove_duplicates_by(sliced.flat(), (e) => e.id);

	const sort = get_edge_sorter(options.sort, plugin.graph);

	const mermaid = wrap_in_codeblock(
		Mermaid.from_edges(flat_unique.sort(sort), {
			click: { method: "class" },
			renderer: options.mermaid_renderer,
			show_attributes: options.show_attributes,
			show_node_options:
				plugin.settings.views.codeblocks.show_node_options,
			direction:
				options.mermaid_direction ??
				(options.dir === "down"
					? "TB"
					: options.dir === "up"
						? "BT"
						: options.dir === "prev"
							? "RL"
							: "LR"),
		}),
		"mermaid",
	);
	log.debug(mermaid);

	const render_mermaid = (node: HTMLElement) => {
		MarkdownRenderer.render(
			plugin.app,
			mermaid,
			node,
			$active_file_store?.path ?? "",
			plugin,
		);
	};
</script>

<div class="BC-codeblock-mermaid">
	<CodeblockErrors {errors} />

	{#if options.title}
		<h3 class="BC-codeblock-mermaid-title">
			{options.title}
		</h3>
	{/if}

	{#if sliced.length}
		<!-- TODO: The max-width doesn't actually work. Mermaid suggests you can set the width, but only via CLI?
	https://mermaid.js.org/syntax/flowchart.html#width -->
		<div
			class="BC-codeblock-mermaid-graph"
			style="max-width: var(--file-line-width);"
			use:render_mermaid
		></div>
	{/if}
</div>
