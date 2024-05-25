<script lang="ts">
	import ObsidianLink from "src/components/ObsidianLink.svelte";
	import { stringify_node } from "src/graph/utils";
	import type { ShowNodeOptions } from "src/interfaces/settings";
	import BreadcrumbsPlugin from "src/main";
	import type { EdgeStruct } from "wasm/pkg/breadcrumbs_graph_wasm";

	export let edge: EdgeStruct;
	export let plugin: BreadcrumbsPlugin;
	// TODO(RUST): make this into a rust struct that we pass. 
	// Then we can make stringify_node a method of the edge struct with the options struct as a parameter.
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
	path={edge.target_path}
	resolved={edge.target_resolved}
	cls="{cls} BC-edge {edge.explicit
		? 'BC-edge-explicit'
		: `BC-edge-implied BC-edge-implied-${edge.edge_source}`}"
/>
