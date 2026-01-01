<script lang="ts">
	import { ChevronDown, ChevronRight } from "lucide-svelte";
	import { ICON_SIZE } from "src/const";

	interface Props {
		open: boolean;
	}

	let { open }: Props = $props();
</script>

{#if open}
	<ChevronDown size={ICON_SIZE} />
{:else}
	<ChevronRight size={ICON_SIZE} />
{/if}
