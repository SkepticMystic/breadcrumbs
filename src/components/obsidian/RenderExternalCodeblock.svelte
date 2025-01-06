<script lang="ts">
	import type BreadcrumbsPlugin from "src/main";
	import { wrap_in_codeblock } from "src/utils/strings";
	import RenderMarkdown from "../obsidian/RenderMarkdown.svelte";

	
	interface Props {
		/** **not** wrapped in a codeblock */
		code: string;
		type: string;
		plugin: BreadcrumbsPlugin;
		source_path?: string | undefined;
	}

	let {
		code,
		type,
		plugin = $bindable(),
		source_path = undefined
	}: Props = $props();
</script>

<RenderMarkdown
	bind:plugin
	{source_path}
	markdown={wrap_in_codeblock(code, type)}
/>
