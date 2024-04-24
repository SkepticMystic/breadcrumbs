<script lang="ts">
	import type { BreadcrumbsError } from "src/interfaces/graph";

	export let errors: BreadcrumbsError[];
</script>

{#if errors.length}
	<h3 class="text-warning">Breadcrumbs Codeblock Errors</h3>

	<ul class="BC-codeblock-tree-errors">
		{#each errors as error}
			<li>
				<code>{error.path}</code>: {error.message}
			</li>
		{/each}
	</ul>
{/if}
