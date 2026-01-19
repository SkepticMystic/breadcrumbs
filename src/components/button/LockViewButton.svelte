<script lang="ts">
	import { LockKeyholeIcon, LockKeyholeOpenIcon } from "lucide-svelte";
	import { ICON_SIZE } from "src/const";
	import { log } from "src/logger";
	interface Props {
		cls?: string;
		lock_view: boolean;
	}

	let { cls = "", lock_view = $bindable() }: Props = $props();
	log.debug("Toggled lock_view to", lock_view)
</script>

<button
	class={cls}
	aria-label={lock_view ? "Locked View" : "Dynamic View" }
	onclick={() => (lock_view = !lock_view)}
>
	{#if lock_view}
		<LockKeyholeIcon size={ICON_SIZE} />
	{:else}
		<LockKeyholeOpenIcon size={ICON_SIZE} />
	{/if}
</button>
