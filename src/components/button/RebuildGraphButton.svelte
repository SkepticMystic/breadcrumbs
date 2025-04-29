<script lang="ts">
	import { RotateCcw } from "lucide-svelte";
	import { ICON_SIZE } from "src/const";
	import type BreadcrumbsPlugin from "src/main";

	export let cls = "";
	export let plugin: BreadcrumbsPlugin;
</script>

<button
	class={cls}
	aria-label="Rebuild Graph"
	on:click={() => plugin.refresh()}
>
	<RotateCcw size={ICON_SIZE} />
</button>
