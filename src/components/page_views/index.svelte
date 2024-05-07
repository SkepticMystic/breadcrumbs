<script lang="ts">
	import type BreadcrumbsPlugin from "src/main";
	import PrevNextView from "./PrevNextView.svelte";
	import TrailView from "./TrailView.svelte";

	export let plugin: BreadcrumbsPlugin;
	// NOTE: We can't rely on $active_file_store, since there may be multiple notes open at once, only one of which is active
	export let file_path: string;

	const enabled_views = {
		grid: plugin.settings.views.page.trail.enabled,
		prev_next: plugin.settings.views.page.prev_next.enabled,
	};
</script>

{#if Object.values(enabled_views).some(Boolean)}
	<div class="markdown-rendered mb-4 flex flex-col gap-2">
		{#if enabled_views.grid}
			<TrailView {plugin} {file_path} />
		{/if}

		{#if enabled_views.prev_next}
			<PrevNextView {plugin} {file_path} />
		{/if}
	</div>
{/if}
