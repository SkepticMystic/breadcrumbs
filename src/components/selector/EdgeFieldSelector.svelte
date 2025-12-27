<script lang="ts">
	import type { EdgeField } from "src/interfaces/settings";
	import { createEventDispatcher } from "svelte";

	interface Props {
		fields: EdgeField[];
		undefine_on_change?: boolean;
		field?: EdgeField | undefined;
	}

	let {
		fields,
		undefine_on_change = true,
		field = $bindable(undefined),
	}: Props = $props();

	const dispatch = createEventDispatcher<{
		select: typeof field | undefined;
	}>();
</script>

<select
	class="dropdown"
	value={field?.label ?? ""}
	onchange={(e) => {
		field = fields.find((field) => field.label === e.currentTarget.value);
		dispatch("select", field);

		if (undefine_on_change) field = undefined;
	}}
>
	<option value="" disabled>Select Field</option>

	{#each fields as { label }}
		<option value={label}>{label}</option>
	{/each}
</select>
