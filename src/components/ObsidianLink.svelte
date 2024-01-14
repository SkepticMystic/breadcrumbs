<script lang="ts">
	import BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import { drop_ext } from "src/utils/paths";

	export let path: string;
	export let resolved: boolean;
	export let plugin: BreadcrumbsPlugin;

	let no_ext = drop_ext(path);
</script>

<a
	class="internal-link"
	class:is-unresolved={!resolved}
	class:BC-active-note={$active_file_store?.path === path}
	href={no_ext}
	data-href={no_ext}
	on:click={() => {
		plugin.app.workspace.openLinkText(path, $active_file_store?.path ?? "");
	}}
>
	{no_ext}
</a>
