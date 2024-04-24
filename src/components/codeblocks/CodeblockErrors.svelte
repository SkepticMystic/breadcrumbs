<script lang="ts">
	import type { BreadcrumbsError } from "src/interfaces/graph";

	export let errors: BreadcrumbsError[];
</script>

{#if errors.length}
	<p class="text-warning">Breadcrumbs Codeblock Errors</p>

	<ul class="BC-codeblock-tree-errors">
		{#each errors as error}
			<li>
				<code class="inline">{error.path}</code>
				<span>: {error.message}</span>
			</li>
		{/each}
	</ul>
{/if}
