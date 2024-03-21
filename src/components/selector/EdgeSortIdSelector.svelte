<script lang="ts">
	import { MoveDownRight, MoveUpRight } from "lucide-svelte";
	import { SIMPLE_EDGE_SORT_FIELDS, type EdgeSortId } from "src/const/graph";
	import { DIRECTIONS } from "src/const/hierarchies";

	export let edge_sort_id: EdgeSortId;
	export let exclude_fields: EdgeSortId["field"][] = [];
</script>

<div class="flex gap-0.5">
	<button
		aria-label={edge_sort_id.order === 1 ? "Ascending" : "Descending"}
		on:click={() => (edge_sort_id.order *= -1)}
	>
		{#if edge_sort_id.order === 1}
			<MoveUpRight size="12" />
		{:else}
			<MoveDownRight size="12" />
		{/if}
	</button>

	<select class="dropdown" bind:value={edge_sort_id.field}>
		{#each SIMPLE_EDGE_SORT_FIELDS.filter((f) => !exclude_fields.includes(f)) as field}
			<option value={field}>{field}</option>
		{/each}

		{#if !exclude_fields.includes("neighbour-dir:")}
			<hr />

			{#each DIRECTIONS as dir}
				<option value="neighbour-dir:{dir}">
					Neighbour: {dir}
				</option>
			{/each}
		{/if}

		<!-- NOTE: I don't think neighbour-field should be exposed in a selector.
        Currently it only gets used in codeblocks, which have a text-interface for the setting -->

		<!-- <hr />
    
        {#each get_all_hierarchy_fields(hierarchies) as field}
            <option value="neighbour:{field}">
                Field Neighbour: {field}
            </option>
        {/each} -->
	</select>
</div>
