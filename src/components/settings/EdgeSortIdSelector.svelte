<script lang="ts">
	import { EDGE_SORT_FIELDS, type EdgeSortId } from "src/const/graph";
	import { createEventDispatcher } from "svelte";

	export let edge_sort_id: EdgeSortId;

	const dispatch = createEventDispatcher<{ select: EdgeSortId }>();
</script>

<select
	bind:value={edge_sort_id.field}
	on:select={() => dispatch("select", edge_sort_id)}
>
	{#each EDGE_SORT_FIELDS as field}
		<option value={field}>{field}</option>
	{/each}
</select>

<select
	bind:value={edge_sort_id.order}
	on:select={() => dispatch("select", edge_sort_id)}
>
	{#each Object.entries({ asc: 1, desc: -1 }) as [label, order]}
		<option value={order}>{label}</option>
	{/each}
</select>
