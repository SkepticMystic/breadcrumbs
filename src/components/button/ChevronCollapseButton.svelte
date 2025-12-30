<script lang="ts">
	import { ChevronsDownUp, ChevronsUpDown } from "lucide-svelte";
	import { ICON_SIZE } from "src/const";

	interface Props {
		cls?: string;
		collapse: boolean | null;
	}

	let { cls = "", collapse = $bindable() }: Props = $props();
</script>

<button
	class={cls}
	aria-label={collapse ? "Expand" : "Collapse"}
	onclick={() => (collapse = !collapse)}
>
	{#if collapse}
		<ChevronsDownUp size={ICON_SIZE} />
	{:else}
		<ChevronsUpDown size={ICON_SIZE} />
	{/if}
</button>
