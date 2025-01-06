<script lang="ts">
	import { CheckIcon, ClipboardIcon } from "lucide-svelte";
	import { ICON_SIZE } from "src/const";
	import { copy_to_clipboard } from "src/utils/obsidian";

	interface Props {
		cls?: string;
		text: string;
		aria_label?: string;
		options?: { notify?: boolean; log?: boolean };
	}

	let {
		cls = "",
		text,
		aria_label = "Copy to Clipboard",
		options = {},
	}: Props = $props();

	let copied = $state(false);
</script>

<button
	class={cls}
	aria-label={copied ? "Copied!" : aria_label}
	onclick={() => {
		copied = true;

		copy_to_clipboard(text, options);

		setTimeout(() => (copied = false), 2_500);
	}}
>
	{#if copied}
		<CheckIcon size={ICON_SIZE} />
	{:else}
		<ClipboardIcon size={ICON_SIZE} />
	{/if}
</button>
