<script lang="ts">
	import BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import { Paths } from "src/utils/paths";

	export let path: string;
	export let display: string;
	export let resolved: boolean;
	export let plugin: BreadcrumbsPlugin;
	export let cls: string = "";

	const no_ext = Paths.drop_ext(path);
</script>

<a
	class="internal-link {cls}"
	class:is-unresolved={!resolved}
	class:BC-active-note={$active_file_store?.path === path}
	href={no_ext}
	data-href={no_ext}
	aria-label={path === display ? "" : path}
	on:click={() => {
		// TODO: There seems to be an Obsidian issue here...
		// I try to open /b from /a, but it opens /folder/b
		plugin.app.workspace.openLinkText(path, $active_file_store?.path ?? "");
	}}
>
	{display}
</a>
