<script lang="ts">
	import type { BreadcrumbsError } from "src/interfaces/graph";
	import type BreadcrumbsPlugin from "src/main";
	import RenderMarkdown from "../obsidian/RenderMarkdown.svelte";

	interface Props {
		plugin: BreadcrumbsPlugin;
		errors: BreadcrumbsError[];
	}

	let { plugin, errors }: Props = $props();

	const markdown = errors
		.map((e) => `- **\`${e.path}\`**: ${e.message}`)
		.join("\n");
</script>

{#if errors.length}
	<p class="text-warning text-lg font-semibold">
		Breadcrumbs Codeblock Errors
	</p>

	<p>The codeblock YAML has errors in the following keys/properties:</p>

	<div class="BC-codeblock-errors">
		<RenderMarkdown {plugin} {markdown} />
	</div>

	<hr />

	<p>
		See the <a
			target="_blank"
			class="external-link"
			href="https://publish.obsidian.md/breadcrumbs-docs/Views/Codeblocks"
		>
			codeblock docs
		</a> for more info
	</p>

	<p>
		Version: <code>{plugin.manifest.version}</code>
	</p>
{/if}
