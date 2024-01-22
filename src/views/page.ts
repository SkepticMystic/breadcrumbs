import { MarkdownView } from "obsidian";
import PageViews from "src/components/page_views/index.svelte";
import type BreadcrumbsPlugin from "src/main";

export const redraw_page_views = (plugin: BreadcrumbsPlugin) => {
	console.log("draw_page_views_on_active_note");

	const active_markdown_view =
		plugin.app.workspace.getActiveViewOfType(MarkdownView);
	if (!active_markdown_view) {
		return console.log("No active markdown view");
	}

	const { containerEl } = active_markdown_view;

	// Ensure the container exists
	const page_views_el =
		document.querySelector(".BC-page-views") ??
		containerEl.createDiv({ cls: "BC-page-views w-full mx-auto" });

	// Set the max width
	// NOTE: Do this _after_ getting the element
	//   So that if it existed already, it gets updated
	const max_width = plugin.settings.views.page.all.readable_line_width
		? "var(--file-line-width)"
		: "none";

	page_views_el.setAttribute("style", `max-width: ${max_width};`);

	// TODO: Maybe instead of emptying and re-rendering,
	//   We can ensure the Svelte component has been rendered (if .BC-page-views existed above)
	//   And rely on Svelte reactivity to update the inners
	//   While we just move the container to the current note
	// Clear out any old content
	page_views_el.empty();

	// Move it to the right place
	const markdown_view_mode = active_markdown_view.getMode();

	if (markdown_view_mode === "preview") {
		const view_parent = containerEl.querySelector(".markdown-preview-view");
		if (!view_parent) return console.log("No view_parent");

		view_parent.insertBefore(page_views_el, view_parent.firstChild);
	} else {
		const view_parent = containerEl.querySelector(".cm-scroller");
		if (!view_parent) return console.log("No view_parent");

		// See here for an in-depth discussion on why it's done this way:
		// https://discord.com/channels/686053708261228577/931552763467411487/1198377191994564621
		// But basically, this shouldn't affect anything, and it's by far the easiest way to do it
		view_parent.addClass("flex-col");

		view_parent.insertBefore(page_views_el, view_parent.firstChild);
	}

	// Render the component into the container
	new PageViews({
		target: page_views_el,
		props: { plugin },
	});
};
