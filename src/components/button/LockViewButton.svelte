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

	let {
		cls = "",
		lock_view = $bindable(),
		lock_path = $bindable(),
		active_path,
	}: Props = $props();

	/**
	 * Capture the path at the moment of locking, not continuously.
	 *
	 * This used to be an `$effect` that kept `lock_path` primed to the active
	 * file whenever the view was unlocked. But `lock_path` is only ever read
	 * while locked, so priming it just rewrote settings on every file switch —
	 * which churned `data.json` on every navigation (#744).
	 */
	const toggle_lock = () => {
		if (!lock_view && active_path) {
			lock_path = active_path;
		}

		lock_view = !lock_view;
	};
</script>

<button
	class={cls}
	aria-label={lock_view ? "Locked View" : "Dynamic View"}
	onclick={toggle_lock}
>
	{#if lock_view}
		<LockKeyholeIcon size={ICON_SIZE} />
	{:else}
		<LockKeyholeOpenIcon size={ICON_SIZE} />
	{/if}
</button>
