<script lang="ts">
	import type BreadcrumbsPlugin from "src/main";
	import GridView from "./GridView.svelte";

	export let plugin: BreadcrumbsPlugin;
</script>

<div>
	{#if plugin.settings.views.page.grid.enabled}
		<GridView {plugin} />
	{/if}
</div>
