<script lang="ts">
	import { ChevronsDownUp, ChevronsUpDown } from "lucide-svelte";
	import { ICON_SIZE } from "src/const";

	export let cls = "";
	export let collapse: boolean | null;
</script>

<button
	class={cls}
	aria-label={collapse ? "Expand" : "Collapse"}
	on:click={() => (collapse = !collapse)}
>
	{#if collapse}
		<ChevronsDownUp size={ICON_SIZE} />
	{:else}
		<ChevronsUpDown size={ICON_SIZE} />
	{/if}
</button>
