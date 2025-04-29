<script lang="ts">
	import { Keymap, Menu } from "obsidian";
	import { log } from "src/logger";
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

<!-- TODO: draggable -->
<!-- svelte-ignore a11y-interactive-supports-focus -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-mouse-events-have-key-events -->
<span
	role="link"
	class="internal-link cursor-pointer {cls}"
	class:is-unresolved={!resolved}
	class:BC-active-note={$active_file_store?.path === path}
	data-href={path}
	aria-label={no_ext === display ? "" : path}
	on:mouseover={(event) => {
		// SOURCE: https://discord.com/channels/686053708261228577/840286264964022302/1225823461901860924
		plugin.app.workspace.trigger("hover-link", {
			event,
			linktext: path,
			// Must match `plugin.registerHoverSource` source (in `main.ts`)
			source: "breadcrumbs",
			targetEl: event.currentTarget,
			hoverParent: event.currentTarget.parentElement,
		});
	}}
	on:contextmenu={(e) => {
		const menu = new Menu();

		// SOURCE: https://discord.com/channels/686053708261228577/840286264964022302/1225828755252052068
		plugin.app.workspace.handleLinkContextMenu(menu, display, path);

		menu.showAtMouseEvent(e);
	}}
	on:auxclick={(e) => {
		log.debug("on:auxclick e.button", e.button);

		if (e.button === 1) {
			plugin.app.workspace.openLinkText(path, "", "tab");
		}
	}}
	on:click={(e) => {
		// NOTE: We openLinkText from vault root, since it's a full path already
		plugin.app.workspace.openLinkText(path, "", Keymap.isModEvent(e));
	}}
>
	{display}
</span>
