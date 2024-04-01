<script lang="ts">
	import type BreadcrumbsPlugin from "src/main";
	import PrevNextView from "./PrevNextView.svelte";
	import GridView from "./TrailView.svelte";

	export let plugin: BreadcrumbsPlugin;

	const enabled_views = {
		grid: plugin.settings.views.page.trail.enabled,
		prev_next: plugin.settings.views.page.prev_next.enabled,
	};
</script>

{#if Object.values(enabled_views).some(Boolean)}
	<div class="markdown-rendered mb-4">
		{#if enabled_views.grid}
			<GridView {plugin} />
		{/if}

		{#if enabled_views.prev_next}
			<PrevNextView {plugin} />
		{/if}
	</div>
{/if}
