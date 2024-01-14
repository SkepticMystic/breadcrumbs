<script lang="ts">
	import type BreadcrumbsPlugin from "src/main";
	import TrailView from "./TrailView.svelte";

	export let plugin: BreadcrumbsPlugin;
</script>

<div>
	{#if plugin.settings.views.page.trail.enabled}
		<TrailView />
	{/if}
</div>
