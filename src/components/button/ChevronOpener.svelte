<script lang="ts">
	import { ChevronDown, ChevronRight } from "lucide-svelte";
	import { ICON_SIZE } from "src/const";

	export let open: boolean;
</script>

{#if open}
	<ChevronDown size={ICON_SIZE} />
{:else}
	<ChevronRight size={ICON_SIZE} />
{/if}
