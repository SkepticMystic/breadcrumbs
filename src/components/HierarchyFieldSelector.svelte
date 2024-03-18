<script lang="ts">
	import type { Hierarchy } from "src/interfaces/hierarchies";
	import { createEventDispatcher } from "svelte";

	export let hierarchies: Hierarchy[];
	export let field: string | undefined = undefined;

	const dispatch = createEventDispatcher<{ select: string | undefined }>();
</script>

<select
	bind:value={field}
	on:select={() => {
		dispatch("select", field);
		field = undefined;
	}}
>
	<option value={undefined}></option>

	{#each hierarchies as hierarchy}
		{#each Object.values(hierarchy.dirs).flat() as field}
			<option value={field}>{field}</option>
		{/each}
	{/each}
</select>
