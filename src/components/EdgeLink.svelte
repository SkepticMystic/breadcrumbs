<script lang="ts">
	import ObsidianLink from "src/components/ObsidianLink.svelte";
	import { stringify_node } from "src/graph/utils";
	import type { ShowNodeOptions } from "src/interfaces/settings";
	import BreadcrumbsPlugin from "src/main";
	import type { EdgeStruct, NodeStringifyOptions } from "wasm/pkg/breadcrumbs_graph_wasm";

	export let edge: EdgeStruct;
	export let plugin: BreadcrumbsPlugin;
	export let node_stringify_options: NodeStringifyOptions;
	export let cls = "";

	const display = edge.stringify_target(node_stringify_options);
</script>

<ObsidianLink
	{plugin}
	{display}
	path={edge.target_path}
	resolved={edge.target_resolved}
	cls="{cls} BC-edge {edge.explicit
		? 'BC-edge-explicit'
		: `BC-edge-implied BC-edge-implied-${edge.edge_source}`}"
/>
