import { MarkdownView } from "obsidian";
import PageViews from "src/components/page_views/index.svelte";
import { log } from "src/logger";
import type BreadcrumbsPlugin from "src/main";

export const redraw_page_views = (plugin: BreadcrumbsPlugin) => {
	const markdown_view =
		plugin.app.workspace.getActiveViewOfType(MarkdownView);
	if (!markdown_view) {
		return log.info("redraw_page_views > No active markdown view");
	}

	const markdown_view_mode = markdown_view.getMode();

	// Ensure the container exists _on the current page_, leaving other pages' containers alone
	const page_views_el =
		markdown_view.containerEl.querySelector(".BC-page-views") ??
		markdown_view.containerEl.createDiv({
			cls: "BC-page-views w-full mx-auto",
		});

	// Set the max width
	// NOTE: Do this _after_ getting the element
	//   So that if it existed already, it gets updated
	const max_width = plugin.settings.views.page.all.readable_line_width
		? "var(--file-line-width)"
		: "none";
	page_views_el.setAttribute("style", `max-width: ${max_width};`);

	// Stickyness
	page_views_el.classList.toggle(
		"BC-page-views-sticky",
		plugin.settings.views.page.all.sticky,
	);

	// Clear out any old content
	page_views_el.empty();

	// Move it to the right place
	if (markdown_view_mode === "preview") {
		// NOTE: Embedded notes also match ".markdown-preview-view", so instead
		//   we ensure the immediate parent is ".markdown-reading-view", which doesn't
		//   exist on embedded notes
		const view_parent = markdown_view.containerEl.querySelector(
			".markdown-reading-view > .markdown-preview-view",
		);
		if (!view_parent) return log.info("redraw_page_views > No view_parent");

		view_parent.insertBefore(page_views_el, view_parent.firstChild);
	} else {
		const view_parent =
			markdown_view.containerEl.querySelector(".cm-scroller");
		if (!view_parent) return log.info("redraw_page_views > No view_parent");

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
