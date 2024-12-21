<script lang="ts">
	import ObsidianLink from "src/components/ObsidianLink.svelte";
	import BreadcrumbsPlugin from "src/main";
	import type { EdgeStruct, NodeStringifyOptions } from "wasm/pkg/breadcrumbs_graph_wasm";

	export let edge: EdgeStruct;
	export let plugin: BreadcrumbsPlugin;
	export let node_stringify_options: NodeStringifyOptions;
	export let cls = "";

	const display = edge.stringify_target(plugin.graph, node_stringify_options);
</script>

<ObsidianLink
	{plugin}
	{display}
	path={edge.target_path(plugin.graph)}
	resolved={edge.target_resolved(plugin.graph)}
	cls="{cls} BC-edge {edge.explicit(plugin.graph)
		? 'BC-edge-explicit'
		: `BC-edge-implied BC-edge-implied-${edge.edge_source}`}"
/>
