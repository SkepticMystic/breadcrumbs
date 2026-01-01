<script lang="ts">
	import { MergeIcon, SplitIcon } from "lucide-svelte";
	import { ICON_SIZE } from "src/const";

	interface Props {
		cls?: string;
		merge_fields: boolean;
	}

	let { cls = "", merge_fields = $bindable() }: Props = $props();
</script>

<button
	class={cls}
	aria-label={merge_fields ? "Separate Fields" : "Merge Fields"}
	onclick={() => (merge_fields = !merge_fields)}
>
	{#if merge_fields}
		<MergeIcon size={ICON_SIZE} />
	{:else}
		<SplitIcon size={ICON_SIZE} />
	{/if}
</button>
