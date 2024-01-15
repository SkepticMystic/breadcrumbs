<script lang="ts">
	import ObsidianLink from "src/components/ObsidianLink.svelte";
	import type { GraphEdge } from "src/interfaces/graph";
	import type { PathKeepOptions } from "src/interfaces/settings";
	import BreadcrumbsPlugin from "src/main";
	import { Path } from "src/utils/paths";

	export let edge: Pick<GraphEdge, "attr" | "target_id" | "target_attr">;
	export let plugin: BreadcrumbsPlugin;
	export let path_keep_options: PathKeepOptions;
	export let cls = "";

	const path = edge.target_id;
	const display = Path.keep(path, path_keep_options);
</script>

<ObsidianLink
	{path}
	{plugin}
	{display}
	resolved={edge.target_attr.resolved}
	cls="{cls} {edge.attr.explicit ? 'BC-edge-explicit' : 'BC-edge-implied'}"
/>
