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
	aria-label={// Previously checked if path === display
	// But I think we should only show the label if the folder/basename is different,
	// not just the extension
	no_ext === display ? "" : path}
	on:click={(e) => {
		// TODO: There seems to be an Obsidian issue here...
		// I try to open /b from /a, but it opens /folder/b
		// TODO: I think #511 comes from here. Test if this does what is expected:
		//  - If only one leaf is open, open the link in that leaf
		//  - If multiple leaves are open, open in the active leaf
		//  - If another window is open, open in the active window
		plugin.app.workspace.openLinkText(
			path,
			$active_file_store?.path ?? "",
			Keymap.isModEvent(e),
			{ group: plugin.app.workspace.getLeaf(false) },
		);
	}}
>
	{display}
</a>
