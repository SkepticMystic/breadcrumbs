<script lang="ts">
	import { Keymap } from "obsidian";
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

<!-- svelte-ignore a11y-interactive-supports-focus -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<span
	role="link"
	class="internal-link cursor-pointer {cls}"
	class:is-unresolved={!resolved}
	class:BC-active-note={$active_file_store?.path === path}
	data-href={path}
	aria-label={// Previously checked if path === display
	// But I think we should only show the label if the folder/basename is different,
	// not just the extension
	no_ext === display ? "" : path}
	on:auxclick|preventDefault={(e) => {
		if (e.button !== 1) return;

		plugin.app.workspace.openLinkText(path, "", "tab");
	}}
	on:click={(e) => {
		// NOTE: We openLinkText from vault root, since it's a full path already
		plugin.app.workspace.openLinkText(path, "", Keymap.isModEvent(e));
	}}
>
	{display}
</span>
