<script lang="ts">
	import type BreadcrumbsPlugin from "src/main";
	import { wrap_in_codeblock } from "src/utils/strings";
	import RenderMarkdown from "../obsidian/RenderMarkdown.svelte";

	/** The mermaid string, **not** wrapped in a codeblock */
	export let mermaid: string;
	export let source_path: string | undefined = undefined;
	export let plugin: BreadcrumbsPlugin;
</script>

<!-- TODO: The max-width doesn't actually work. Mermaid suggests you can set the width, but only via CLI?
	https://mermaid.js.org/syntax/flowchart.html#width -->
<RenderMarkdown
	bind:plugin
	{source_path}
	markdown={wrap_in_codeblock(mermaid, "mermaid")}
/>
