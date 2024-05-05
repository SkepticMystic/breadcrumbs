<script lang="ts">
	import type BreadcrumbsPlugin from "src/main";
	import { wrap_in_codeblock } from "src/utils/strings";
	import RenderMarkdown from "../obsidian/RenderMarkdown.svelte";

	/** The markmap string, **not** wrapped in a codeblock */
	export let markmap: string;
	export let plugin: BreadcrumbsPlugin;
	export let source_path: string | undefined = undefined;
</script>

<RenderMarkdown
	bind:plugin
	{source_path}
	markdown={wrap_in_codeblock(markmap, "markmap")}
/>
