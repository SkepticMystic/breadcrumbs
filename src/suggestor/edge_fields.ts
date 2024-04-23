import {
	Editor,
	EditorSuggest,
	TFile,
	type EditorPosition,
	type EditorSuggestContext,
	type EditorSuggestTriggerInfo,
} from "obsidian";
import type BreadcrumbsPlugin from "src/main";

export class EdgeFieldSuggestor extends EditorSuggest<string> {
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
		const { trigger } = this.plugin.settings.suggestors.edge_field;

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
		this.plugin.settings.edge_fields
			.map((f) => f.label)
			.filter((field) => field.includes(query));

	renderSuggestion(suggestion: string, el: HTMLElement) {
		el.createDiv({ text: suggestion });
	}

	selectSuggestion(suggestion: string) {
		if (!this.context) return;
		const { start, end, editor } = this.context;

		editor.replaceRange(suggestion + ":: [[", start, end);
	}
}
