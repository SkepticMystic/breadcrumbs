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

	// Ensure the container exists
	const page_views_el =
		document.querySelector(".BC-page-views") ??
		containerEl.createDiv({ cls: "BC-page-views" });

	// Clear out any old content
	page_views_el.empty();

	// Move it to the right place
	const markdown_view_mode = active_markdown_view.getMode();

	if (markdown_view_mode === "preview") {
		const view_parent = containerEl.querySelector(".markdown-preview-view");
		if (!view_parent) {
			return console.log("No view_parent");
		}

		view_parent.insertBefore(page_views_el, view_parent.firstChild);
	} else {
		// TODO: There's an issue in 'source' mode where BC-page-views
		//   is constrained by the max-width of .cm-sizer
		//   I've tried some fancy flex things, like:
		//   - { flex-shrink: 0; flex-basis: 1000px; }
		//     (this doesn't work because the container flexes as a column, and flex-basis only applies to the flex-direction. Whereas we want to grow in the row direction)
		//   - { align-self: center; width: 130% }
		//     (this one is better, but fails because the page-views then don't shrink beyond this new width)
		const view_parent = containerEl.querySelector(".cm-sizer");
		if (!view_parent) {
			return console.log("No view_parent");
		}

		view_parent.insertBefore(page_views_el, view_parent.firstChild);
	}

	// Render the component into the container
	new PageViews({
		target: page_views_el,
		props: { plugin },
	});
};
