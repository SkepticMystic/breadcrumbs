<script lang="ts">
	import type { BCEdge, EdgeAttribute } from "src/graph/MyMultiGraph";
	import type { EdgeSorter } from "src/graph/utils";
	import type { EdgeField } from "src/interfaces/settings";
	import type BreadcrumbsPlugin from "src/main";
	import { untyped_pick } from "src/utils/objects";
	import { url_search_params } from "src/utils/url";
	import EdgeLink from "../EdgeLink.svelte";
	import ChevronOpener from "../button/ChevronOpener.svelte";
	import TreeItemFlair from "../obsidian/TreeItemFlair.svelte";

	export let edges: BCEdge[];
	export let field: EdgeField;
	export let plugin: BreadcrumbsPlugin;
	// NOTE: These are available on settings, but they're modified in the parent component,
	// 	so rather pass them in to receive updates
	export let show_attributes: EdgeAttribute[];

	let { show_node_options } = plugin.settings.views.side.matrix;

	export let sort: EdgeSorter;

	let open = true;
</script>

<details
	class="BC-matrix-view-field BC-matrix-view-field-{field.label} tree-item"
	bind:open
>
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<summary class="tree-item-self is-clickable mod-collapsible text-lg">
		<div class="tree-item-icon collapse-icon">
			<ChevronOpener {open} />
		</div>

		<div class="tree-item-inner">
			<span class="tree-item-inner-text">
				{field.label}
			</span>
		</div>

		<div class="tree-item-flair-outer">
			<span class="tree-item-flair">
				{edges.length}
			</span>
		</div>
	</summary>

	<div class="tree-item-children flex flex-col">
		{#key sort}
			{#each edges.sort(sort) as edge}
				<div class="tree-item">
					<div class="tree-item-self is-clickable">
						<div class="tree-item-inner flex grow">
							<EdgeLink
								{edge}
								{plugin}
								{show_node_options}
								cls="grow tree-item-inner-text"
							/>
						</div>

						<TreeItemFlair
							cls="font-mono"
							label={edge.attr.explicit ? "x" : "i"}
							aria_label={url_search_params(
								untyped_pick(edge.attr, show_attributes),
								{ trim_lone_param: true },
							)}
						/>
					</div>
				</div>
			{/each}
		{/key}
	</div>
</details>
