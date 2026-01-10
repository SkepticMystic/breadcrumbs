<script lang="ts">
	import { Keymap, Menu } from "obsidian";
	import { log } from "src/logger";
	import BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import { Paths } from "src/utils/paths";

	interface Props {
		path: string;
		display: string;
		resolved: boolean;
		plugin: BreadcrumbsPlugin;
		cls?: string;
	}

	let { path, display, resolved, plugin, cls = "" }: Props = $props();

	const no_ext = Paths.drop_ext(path);

	// log.debug("ObsidianLink", { path, no_ext, display, resolved });

	let active_file = $derived($active_file_store);
</script>

<!-- TODO: draggable -->
<!-- svelte-ignore a11y_interactive_supports_focus -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_mouse_events_have_key_events -->
<span
	role="link"
	class="internal-link cursor-pointer {cls}"
	class:is-unresolved={!resolved}
	class:BC-active-note={active_file?.path === path}
	data-href={path}
	aria-label={no_ext === display ? "" : path}
	onmouseover={(event) => {
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
	oncontextmenu={(e) => {
		const menu = new Menu();

		// SOURCE: https://discord.com/channels/686053708261228577/840286264964022302/1225828755252052068
		plugin.app.workspace.handleLinkContextMenu(menu, display, path);

		menu.showAtMouseEvent(e);
	}}
	onauxclick={(e) => {
		log.debug("on:auxclick e.button", e.button);

		if (e.button === 1) {
			plugin.app.workspace.openLinkText(path, "", "tab");
		}
	}}
	onclick={(e) => {
		// NOTE: We openLinkText from vault root, since it's a full path already
		plugin.app.workspace.openLinkText(path, "", Keymap.isModEvent(e));
	}}
>
	{display}
</span>
