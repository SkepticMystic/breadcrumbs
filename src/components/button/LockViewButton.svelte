<script lang="ts">
	import { LockKeyholeIcon, LockKeyholeOpenIcon } from "lucide-svelte";
	import { ICON_SIZE } from "src/const";
	import { log } from "src/logger";

	interface Props {
		cls?: string;
		lock_view: boolean;
		lock_path?: string | null;
		active_path?: string | null;
	}

	let { cls = "", lock_view = $bindable(), lock_path = $bindable(), active_path }: Props = $props();

	$effect(() => {
		if (!lock_view && active_path) {
			lock_path = active_path;
			log.debug("Setting lock_path to active_path:", lock_path);
		}
	});
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
