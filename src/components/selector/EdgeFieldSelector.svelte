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
	on:change={(e) => {
		dispatch(
			"select",
			fields.find((field) => field.label === e.currentTarget.value),
		);
		field = undefined;
	}}
>
	<option value={undefined}>Select Field</option>

	{#each fields as { label }}
		<option value={label}>{label}</option>
	{/each}
</select>
