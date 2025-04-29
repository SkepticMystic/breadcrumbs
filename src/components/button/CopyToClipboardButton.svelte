<script lang="ts">
	import { CheckIcon, ClipboardIcon } from "lucide-svelte";
	import { ICON_SIZE } from "src/const";
	import { copy_to_clipboard } from "src/utils/obsidian";

	export let cls = "";
	export let text: string;
	export let aria_label = "Copy to Clipboard";
	export let options: { notify?: boolean; log?: boolean } = {};

	let copied = false;
</script>

<button
	class={cls}
	aria-label={copied ? "Copied!" : aria_label}
	on:click={() => {
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
