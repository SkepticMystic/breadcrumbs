<script lang="ts">
	import type { PathKeepOptions } from "src/interfaces/settings";
	import BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import { Path } from "src/utils/paths";

	export let path: string;
	export let resolved: boolean;
	export let plugin: BreadcrumbsPlugin;
	export let path_keep_options: PathKeepOptions;
	export let cls: string = "";

	const no_ext = Path.drop_ext(path);
	const pretty_path = Path.keep(path, path_keep_options);
</script>

<a
	class="internal-link {cls}"
	class:is-unresolved={!resolved}
	class:BC-active-note={$active_file_store?.path === path}
	href={no_ext}
	data-href={no_ext}
	aria-label={path === pretty_path ? "" : path}
	on:click={() => {
		plugin.app.workspace.openLinkText(path, $active_file_store?.path ?? "");
	}}
>
	{pretty_path}
</a>
