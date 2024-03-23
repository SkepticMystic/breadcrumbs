<script lang="ts">
	import { RotateCcw } from "lucide-svelte";
	import type BreadcrumbsPlugin from "src/main";

	export let plugin: BreadcrumbsPlugin;
	export let cls = "";
</script>

<button
	class={cls}
	aria-label="Rebuild Graph"
	on:click={() => plugin.refresh()}
>
	<RotateCcw size="12" />
</button>
