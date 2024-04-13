<script lang="ts">
	import type { EdgeField } from "src/interfaces/settings";
	import { createEventDispatcher } from "svelte";

	export let fields: EdgeField[];
	export let field: EdgeField | undefined = undefined;

	const dispatch = createEventDispatcher<{
		select: typeof field | undefined;
	}>();
</script>

<select
	class="dropdown"
	on:change={() => {
		dispatch("select", field);
		field = undefined;
	}}
>
	<option value={undefined}>Select Field</option>

	{#each fields as field}
		<option value={field}>{field.label}</option>
	{/each}
</select>
