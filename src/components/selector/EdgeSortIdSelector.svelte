<script lang="ts">
	import { SIMPLE_EDGE_SORT_FIELDS, type EdgeSortId } from "src/const/graph";
	import { DIRECTIONS } from "src/const/hierarchies";

	export let edge_sort_id: EdgeSortId;
</script>

<div class="flex gap-2">
	<select class="dropdown" bind:value={edge_sort_id.field}>
		{#each SIMPLE_EDGE_SORT_FIELDS as field}
			<option value={field}>{field}</option>
		{/each}

		<hr />

		{#each DIRECTIONS as dir}
			<option value="neighbour-dir:{dir}">
				Direction Neighbour: {dir}
			</option>
		{/each}

		<!-- NOTE: I don't think neighbour-field should be exposed in a selector.
        Currently it only gets used in codeblocks, which have a text-interface for the setting -->

		<!-- <hr />
    
        {#each get_all_hierarchy_fields(hierarchies) as field}
            <option value="neighbour:{field}">
                Field Neighbour: {field}
            </option>
        {/each} -->
	</select>

	<button
		title={edge_sort_id.order === 1 ? "Ascending" : "Descending"}
		on:click={() => {
			edge_sort_id.order *= -1;
			// TODO: Check if this is necessary
			edge_sort_id = edge_sort_id;
		}}
	>
		{edge_sort_id.order === 1 ? "↑" : "↓"}
	</button>
</div>
