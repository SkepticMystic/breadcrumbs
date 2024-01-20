<script lang="ts">
	import type BreadcrumbsPlugin from "src/main";
	import GridView from "./GridView.svelte";
	import PrevNextView from "./PrevNextView.svelte";

	export let plugin: BreadcrumbsPlugin;
</script>

<div class="mb-4">
	{#if plugin.settings.views.page.grid.enabled}
		<GridView {plugin} />
	{/if}

	{#if plugin.settings.views.page.prev_next.enabled}
		<PrevNextView {plugin} />
	{/if}
</div>
