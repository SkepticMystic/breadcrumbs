<script lang="ts">
	import { LockKeyholeIcon, LockKeyholeOpenIcon } from "lucide-svelte";
	import { ICON_SIZE } from "src/const";

	interface Props {
		cls?: string;
		lock_view: boolean;
	}

	let { cls = "", lock_view = $bindable() }: Props = $props();
</script>

<button
	class={cls}
	aria-label={lock_view ? "Separate Fields" : "Merge Fields"}
	onclick={() => (lock_view = !lock_view)}
>
	{#if lock_view}
		<LockKeyholeIcon size={ICON_SIZE} />
	{:else}
		<LockKeyholeOpenIcon size={ICON_SIZE} />
	{/if}
</button>
