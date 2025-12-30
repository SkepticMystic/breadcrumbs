<script lang="ts">
	import { RotateCcw } from "lucide-svelte";
	import { ICON_SIZE } from "src/const";
	import type BreadcrumbsPlugin from "src/main";

	interface Props {
		cls?: string;
		plugin: BreadcrumbsPlugin;
	}

	let { cls = "", plugin }: Props = $props();
</script>

<button
	class={cls}
	aria-label="Rebuild Graph"
	onclick={() => plugin.rebuildGraph()}
>
	<RotateCcw size={ICON_SIZE} />
</button>
