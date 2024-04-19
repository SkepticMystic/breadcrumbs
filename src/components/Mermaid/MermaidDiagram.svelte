<script lang="ts">
	import { MarkdownRenderer } from "obsidian";
	import { log } from "src/logger";
	import type BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import { wrap_in_codeblock } from "src/utils/strings";

	/** The mermaid string, **not** wrapped in a codeblock */
	export let mermaid: string;
	export let source_path: string | undefined = undefined;
	export let plugin: BreadcrumbsPlugin;

	let el: HTMLElement | undefined;

	// we need to pass both the mermaid string and the target element, so that it re-renders when the mermaid string changes
	// and for the initial render the target element is undefined, so we need to check for that
	const render_mermaid = (mermaid: string, el: HTMLElement | undefined) => {
		if (!el) return;

		log.debug("rendering mermaid");

		el.empty();

		MarkdownRenderer.render(
			plugin.app,
			wrap_in_codeblock(mermaid, "mermaid"),
			el,
			source_path ?? $active_file_store?.path ?? "",
			plugin,
		);
	};

	$: render_mermaid(mermaid, el);
</script>

<!-- TODO: The max-width doesn't actually work. Mermaid suggests you can set the width, but only via CLI?
	https://mermaid.js.org/syntax/flowchart.html#width -->
<div class="BC-mermaid-graph" bind:this={el}></div>
