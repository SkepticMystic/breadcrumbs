<script lang="ts">
	import type { Direction } from "src/const/hierarchies";
	import type { BCEdge, EdgeAttribute } from "src/graph/MyMultiGraph";
	import type { EdgeSorter } from "src/graph/utils";
	import type { Hierarchy } from "src/interfaces/hierarchies";
	import type BreadcrumbsPlugin from "src/main";
	import { untyped_pick } from "src/utils/objects";
	import { url_search_params } from "src/utils/url";
	import ChevronOpener from "../ChevronOpener.svelte";
	import EdgeLink from "../EdgeLink.svelte";

	export let dir: Direction;
	export let hierarchy: Hierarchy;
	export let dir_out_edges: BCEdge[];
	export let plugin: BreadcrumbsPlugin;
	export let show_attributes: EdgeAttribute[];

	export let sort: EdgeSorter;

	let open = true;
</script>

<details
	class="BC-matrix-view-dir BC-matrix-view-dir-{dir} tree-item"
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
				{hierarchy.dirs[dir].join(", ")}
			</span>
		</div>

		<div class="tree-item-flair-outer">
			<span class="tree-item-flair">
				{dir_out_edges.length}
			</span>
		</div>
	</summary>

	<div class="tree-item-children flex flex-col">
		{#key sort}
			{#each dir_out_edges.sort(sort) as edge}
				<div class="tree-item">
					<div class="tree-item-self is-clickable">
						<div class="tree-item-inner flex grow">
							<EdgeLink
								{edge}
								{plugin}
								cls="grow tree-item-inner-text"
								show_node_options={plugin.settings.views.side
									.matrix.show_node_options}
							/>
						</div>

						<div class="tree-item-flair-outer">
							<span
								class="tree-item-flair font-mono"
								aria-label={url_search_params(
									untyped_pick(edge.attr, show_attributes),
								)}
							>
								{edge.attr.explicit ? "x" : "i"}
							</span>
						</div>
					</div>
				</div>
			{/each}
		{/key}
	</div>
</details>
