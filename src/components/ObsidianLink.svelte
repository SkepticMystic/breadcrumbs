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

<a
	class="internal-link {cls}"
	class:is-unresolved={!resolved}
	class:BC-active-note={$active_file_store?.path === path}
	href={no_ext}
	data-href={no_ext}
	rel="noopener"
	target="_blank"
	aria-label={// Previously checked if path === display
	// But I think we should only show the label if the folder/basename is different,
	// not just the extension
	no_ext === display ? "" : path}
	on:click={(e) => {
		// NOTE: We openLinkText from vault root, since it's a full path already
		// TODO: I think #511 comes from here. Test if this does what is expected:
		//  - If only one leaf is open, open the link in that leaf
		//  - If multiple leaves are open, open in the active leaf
		//  - If another window is open, open in the active window
		plugin.app.workspace.openLinkText(path, "", Keymap.isModEvent(e));
	}}
>
	{display}
</a>
