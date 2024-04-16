<script lang="ts">
	import type { EdgeField } from "src/interfaces/settings";
	import { createEventDispatcher } from "svelte";

	export let fields: EdgeField[];
	export let undefine_on_change = true;
	export let field: EdgeField | undefined = undefined;

	const dispatch = createEventDispatcher<{
		select: typeof field | undefined;
	}>();
</script>

<select
	class="dropdown"
	value={field ? field.label : undefined}
	on:change={(e) => {
		field = fields.find((field) => field.label === e.currentTarget.value);
		dispatch("select", field);

		if (undefine_on_change) field = undefined;
	}}
>
	<option value={undefined}>Select Field</option>

	{#each fields as { label }}
		<option value={label}>{label}</option>
	{/each}
</select>
