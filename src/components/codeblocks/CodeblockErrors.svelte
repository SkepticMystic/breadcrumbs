<script lang="ts">
	import type { BreadcrumbsError } from "src/interfaces/graph";

	export let errors: BreadcrumbsError[];
</script>

{#if errors.length}
	<p class="text-warning text-lg font-semibold">
		Breadcrumbs Codeblock Errors
	</p>

	<p>The codeblock YAML has errors in the following keys/properties:</p>

	<ul class="BC-codeblock-tree-errors">
		{#each errors as error}
			<li>
				<code class="inline">{error.path}</code>
				<span>: {error.message}</span>
			</li>
		{/each}
	</ul>

	<hr />

	<p>
		See the <a
			target="_blank"
			href="https://publish.obsidian.md/breadcrumbs-docs/Views/Codeblocks"
		>
			codeblock docs
		</a> for more info
	</p>
{/if}
