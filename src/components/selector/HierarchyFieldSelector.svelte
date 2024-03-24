<script lang="ts">
	import type { Hierarchy } from "src/interfaces/hierarchies";
	import { createEventDispatcher } from "svelte";

	export let hierarchies: Hierarchy[];
	export let field: string | undefined = undefined;

	const dispatch = createEventDispatcher<{ select: string | undefined }>();
</script>

<select
	class="dropdown"
	bind:value={field}
	on:change={() => {
		dispatch("select", field);
		field = undefined;
	}}
>
	<option value={undefined}>Select Field</option>

	{#each hierarchies as hierarchy}
		{#each Object.values(hierarchy.dirs).flat() as field}
			{#if field}
				<option value={field}>{field}</option>
			{/if}
		{/each}
	{/each}
</select>
