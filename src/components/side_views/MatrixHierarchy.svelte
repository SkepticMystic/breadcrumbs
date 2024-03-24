<script lang="ts">
	import { DIRECTIONS } from "src/const/hierarchies";
	import { type BCEdge, type EdgeAttribute } from "src/graph/MyMultiGraph";
	import { has_edge_attrs, type EdgeSorter } from "src/graph/utils";
	import type { Hierarchy } from "src/interfaces/hierarchies";
	import type BreadcrumbsPlugin from "src/main";
	import { untyped_pick } from "src/utils/objects";
	import { url_search_params } from "src/utils/url";
	import EdgeLink from "../EdgeLink.svelte";

	export let plugin: BreadcrumbsPlugin;
	export let hierarchy: Hierarchy;
	export let hierarchy_out_edges: BCEdge[];
	export let show_attributes: EdgeAttribute[];
	export let sort: EdgeSorter;
</script>

<div class="BC-matrix-view-hierarchy flex flex-col gap-4">
	{#each DIRECTIONS as dir}
		{@const out_edges = hierarchy_out_edges.filter((e) =>
			has_edge_attrs(e, { dir }),
		)}

		{#if out_edges.length}
			<div class="BC-matrix-view-dir flex flex-col gap-1">
				<span class="text-lg font-semibold">
					{hierarchy.dirs[dir].join(", ")}
				</span>

				<div class="flex flex-col">
					{#key sort}
						{#each out_edges.sort(sort) as edge}
							<div class="tree-item">
								<div class="tree-item-self is-clickable">
									<EdgeLink
										{edge}
										{plugin}
										cls="grow tree-item-inner"
										show_node_options={plugin.settings.views
											.side.matrix.show_node_options}
									/>

									<div class="tree-item-flair-outer">
										<span
											class="tree-item-flair font-mono"
											aria-label={url_search_params(
												untyped_pick(
													edge.attr,
													show_attributes,
												),
											)}
										>
											({edge.attr.explicit ? "x" : "i"})
										</span>
									</div>
								</div>
							</div>
						{/each}
					{/key}
				</div>
			</div>
		{/if}
	{/each}
</div>
