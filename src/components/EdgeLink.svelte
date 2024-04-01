<script lang="ts">
	import ObsidianLink from "src/components/ObsidianLink.svelte";
	import type { BCEdge } from "src/graph/MyMultiGraph";
	import { stringify_node } from "src/graph/utils";
	import type { ShowNodeOptions } from "src/interfaces/settings";
	import BreadcrumbsPlugin from "src/main";

	export let edge: Pick<BCEdge, "attr" | "target_id" | "target_attr">;
	export let plugin: BreadcrumbsPlugin;
	export let show_node_options: ShowNodeOptions;
	export let cls = "";

	const { dendron_note } = plugin.settings.explicit_edge_sources;

	const display = stringify_node(edge.target_id, edge.target_attr, {
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
	path={edge.target_id}
	resolved={edge.target_attr.resolved}
	cls="{cls} BC-edge {edge.attr.explicit
		? 'BC-edge-explicit'
		: `BC-edge-implied BC-edge-implied-${edge.attr.implied_kind}`}"
/>
