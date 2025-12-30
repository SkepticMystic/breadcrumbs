<script lang="ts">
	import type BreadcrumbsPlugin from "src/main";
	import PrevNextView from "./PrevNextView.svelte";
	import TrailView from "./TrailView.svelte";

	interface Props {
		plugin: BreadcrumbsPlugin;
		// NOTE: We can't rely on $active_file_store, since there may be multiple notes open at once, only one of which is active
		file_path: string;
	}

	let { plugin, file_path }: Props = $props();

	const grid_enabled = plugin.settings.views.page.trail.enabled;
	const prev_next_enabled = plugin.settings.views.page.prev_next.enabled;
</script>

{#if grid_enabled || prev_next_enabled}
	<div class="markdown-rendered mb-4 flex flex-col gap-2">
		{#if grid_enabled}
			<TrailView {plugin} {file_path} />
		{/if}

		{#if prev_next_enabled}
			<PrevNextView {plugin} {file_path} />
		{/if}
	</div>
{/if}
