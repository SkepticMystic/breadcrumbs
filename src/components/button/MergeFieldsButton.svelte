<script lang="ts">
	import { MergeIcon, SplitIcon } from "lucide-svelte";
	import { ICON_SIZE } from "src/const";

	export let cls = "";
	export let merge_fields: boolean;
</script>

<button
	class={cls}
	aria-label={merge_fields ? "Separate Fields" : "Merge Fields"}
	on:click={() => (merge_fields = !merge_fields)}
>
	{#if merge_fields}
		<MergeIcon size={ICON_SIZE} />
	{:else}
		<SplitIcon size={ICON_SIZE} />
	{/if}
</button>
