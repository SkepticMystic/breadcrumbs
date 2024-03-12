<script lang="ts">
	import { EDGE_SORT_FIELDS, type EdgeSortId } from "src/const/graph";
	import { createEventDispatcher } from "svelte";
	import SettingItem from "./SettingItem.svelte";

	export let edge_sort_id: EdgeSortId;

	const dispatch = createEventDispatcher<{ select: EdgeSortId }>();
</script>

<SettingItem
	name="Edge Sort"
	description="Select the sorting method for the edges in the graph."
>
	<select
		class="dropdown"
		bind:value={edge_sort_id.field}
		on:select={() => dispatch("select", edge_sort_id)}
	>
		{#each EDGE_SORT_FIELDS as field}
			<option value={field}>{field}</option>
		{/each}
	</select>

	<select
		class="dropdown"
		bind:value={edge_sort_id.order}
		on:select={() => dispatch("select", edge_sort_id)}
	>
		{#each Object.entries({ asc: 1, desc: -1 }) as [label, order]}
			<option value={order}>{label}</option>
		{/each}
	</select>
</SettingItem>
