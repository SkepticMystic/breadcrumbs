<script lang="ts">
	import { ChevronsDownUp, ChevronsUpDown } from "lucide-svelte";
	import { ICON_SIZE } from "src/const";

	export let cls = "";
	export let merge_fields: boolean;
</script>

<button
	class={cls}
	aria-label={merge_fields ? "Separate Fields" : "Merge Fields"}
	on:click={() => (merge_fields = !merge_fields)}
>
	<!-- TODO(NODIR): Get better icons -->
	{#if merge_fields}
		<ChevronsUpDown size={ICON_SIZE} />
	{:else}
		<ChevronsDownUp size={ICON_SIZE} />
	{/if}
</button>
