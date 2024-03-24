<script lang="ts">
	import { DIRECTIONS, type Direction } from "src/const/hierarchies";

	export let dir: Direction;
</script>

<select class="dropdown" bind:value={dir}>
	{#each DIRECTIONS as dir}
		<option value={dir}>{dir}</option>
	{/each}
</select>
