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

	const path = edge.target_id;
	const display = stringify_node(path, edge.target_attr, {
		show_node_options,
	});
</script>

<ObsidianLink
	{path}
	{plugin}
	{display}
	resolved={edge.target_attr.resolved}
	cls="{cls} {edge.attr.explicit ? 'BC-edge-explicit' : 'BC-edge-implied'} "
/>

<!-- TODO: Add the implied_kind or source. Maybe as a data attribute, but maybe just as a class -->

<!-- BREAKING: BC-edge-implied used to be BC-implied, I believe -->
