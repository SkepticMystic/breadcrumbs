<script lang="ts">
	import type { BreadcrumbsError } from "src/interfaces/graph";

	export let errors: BreadcrumbsError[];
</script>

{#if errors.length}
	<h3 class="text-error">Breadcrumbs Codeblock Errors</h3>

	<ul class="BC-codeblock-tree-errors">
		{#each errors as error}
			<li>
				<code>{error.message}</code>
			</li>
		{/each}
	</ul>
{/if}
