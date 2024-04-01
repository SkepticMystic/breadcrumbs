import {
	Editor,
	EditorSuggest,
	TFile,
	type EditorPosition,
	type EditorSuggestContext,
	type EditorSuggestTriggerInfo,
} from "obsidian";
import type BreadcrumbsPlugin from "src/main";
import {
	get_all_hierarchy_fields,
	get_field_hierarchy,
} from "src/utils/hierarchies";
import { url_search_params } from "src/utils/url";

export class HierarchyFieldSuggestor extends EditorSuggest<string> {
	plugin: BreadcrumbsPlugin;

	constructor(plugin: BreadcrumbsPlugin) {
		super(plugin.app);

		this.plugin = plugin;
	}

	onTrigger(
		cursor: EditorPosition,
		editor: Editor,
		_file: TFile,
	): EditorSuggestTriggerInfo | null {
		const { trigger } = this.plugin.settings.suggestors.hierarchy_field;

		// Get everything before the cursor
		const sub = editor.getLine(cursor.line).substring(0, cursor.ch);
		if (!sub.startsWith(trigger)) return null;

		// Get the query
		const query = sub.slice(trigger.length);

		return {
			query,
			end: cursor,
			start: { ch: 0, line: cursor.line },
		};
	}

	getSuggestions = ({ query }: EditorSuggestContext) =>
		get_all_hierarchy_fields(this.plugin.settings.hierarchies).filter(
			(field) => field.includes(query),
		);

	renderSuggestion(suggestion: string, el: HTMLElement) {
		const hierarchy_field = get_field_hierarchy(
			this.plugin.settings.hierarchies,
			suggestion,
		);
		if (!hierarchy_field) return;

		el.createDiv({ text: suggestion });

		const alt = el.createDiv({
			text: url_search_params({ dir: hierarchy_field.dir }),
		});

		alt.style.fontSize = "0.8em";
		alt.style.color = "var(--text-muted)";
	}

	selectSuggestion(suggestion: string) {
		if (!this.context) return;
		const { start, end, editor } = this.context;

		editor.replaceRange(suggestion + ":: [[", start, end);
	}
}
