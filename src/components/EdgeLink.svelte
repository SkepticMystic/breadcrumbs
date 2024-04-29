<script lang="ts">
	import ObsidianLink from "src/components/ObsidianLink.svelte";
	import type { BCEdge } from "src/graph/MyMultiGraph";
	import { stringify_node } from "src/graph/utils";
	import type { ShowNodeOptions } from "src/interfaces/settings";
	import BreadcrumbsPlugin from "src/main";
	import type { EdgeData, EdgeStruct, NodeData } from "wasm/pkg/breadcrumbs_graph_wasm";

	export let edge: EdgeStruct;
	export let plugin: BreadcrumbsPlugin;
	export let show_node_options: ShowNodeOptions;
	export let cls = "";

	let target_node = edge.target;
	const { dendron_note } = plugin.settings.explicit_edge_sources;

	const display = stringify_node(target_node, {
		show_node_options,
		trim_basename_delimiter:
			dendron_note.enabled && dendron_note.display_trimmed
				? dendron_note.delimiter
				: undefined,
	});
</script>

<ObsidianLink
	{plugin}
	{display}
	path={target_node.path}
	resolved={target_node.resolved}
	cls="{cls} BC-edge {!edge.implied
		? 'BC-edge-explicit'
		: `BC-edge-implied BC-edge-implied-${edge.edge_source}`}"
/>
