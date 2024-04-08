<script lang="ts">
	import { ChevronsDownUp, ChevronsUpDown } from "lucide-svelte";
	import { ICON_SIZE } from "src/const";

	export let cls = "";
	export let open: boolean | null;
</script>

<button
	class={cls}
	aria-label={open ? "Collapse" : "Expand"}
	on:click={() => (open = !open)}
>
	{#if open}
		<ChevronsUpDown size={ICON_SIZE} />
	{:else}
		<ChevronsDownUp size={ICON_SIZE} />
	{/if}
</button>
