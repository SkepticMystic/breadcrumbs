import { MarkdownView } from "obsidian";
import PageViews from "src/components/page_views/index.svelte";
import type BreadcrumbsPlugin from "src/main";

export const draw_page_views_on_active_note = (plugin: BreadcrumbsPlugin) => {
	console.log("draw_page_views_on_active_note");

	const active_markdown_view =
		plugin.app.workspace.getActiveViewOfType(MarkdownView);

	if (!active_markdown_view) {
		return console.log("No active markdown view");
	}

	const { containerEl } = active_markdown_view;

	let page_views_el = document.querySelector(".BC-page-views");
	if (!page_views_el) {
		page_views_el = containerEl.createDiv({ cls: "BC-page-views" });
	}

	// Clear out any old content
	page_views_el.empty();

	// Move it to the right place
	containerEl.insertAfter(page_views_el, containerEl.firstChild);

	new PageViews({
		target: page_views_el,
		props: { plugin },
	});
};
