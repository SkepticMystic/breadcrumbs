<script lang="ts">
	import BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import { drop_ext } from "src/utils/paths";

	export let path: string;
	export let resolved: boolean;
	export let plugin: BreadcrumbsPlugin;
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<span
	class="internal-link"
	class:is-unresolved={!resolved}
	on:click={() => {
		plugin.app.workspace.openLinkText(path, $active_file_store?.path ?? "");
	}}
>
	{drop_ext(path)}
</span>
