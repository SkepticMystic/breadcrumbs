import {
  Editor,
  EditorPosition,
  EditorSuggest,
  EditorSuggestContext,
  EditorSuggestTriggerInfo,
  TFile,
} from "obsidian";
import { isInsideYaml } from "./Utils/ObsidianUtils";
import { BC_FIELDS_INFO } from "./constants";
import type BCPlugin from "./main";

export class FieldSuggestor extends EditorSuggest<string> {
  plugin: BCPlugin;

  constructor(plugin: BCPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onTrigger(
    cursor: EditorPosition,
    editor: Editor,
    _: TFile
  ): EditorSuggestTriggerInfo | null {
    const sub = editor.getLine(cursor.line).substring(0, cursor.ch);
    const match = sub.match(/^BC-(.*)$/)?.[1];
    if (match !== undefined) {
      return {
        end: cursor,
        start: {
          ch: sub.lastIndexOf(match),
          line: cursor.line,
        },
        query: match,
      };
    }

    return null;
  }

  getSuggestions = (context: EditorSuggestContext) => {
    const { query } = context;
    return BC_FIELDS_INFO.map((sug) => sug.field).filter((sug) =>
      sug.includes(query)
    );
  };

  renderSuggestion(suggestion: string, el: HTMLElement): void {
    el.createDiv({
      text: suggestion.replace("BC-", ""),
      cls: "BC-suggester-container",
      attr: {
        "aria-label": BC_FIELDS_INFO.find((f) => f.field === suggestion)?.desc,
        "aria-label-position": "right",
      },
    });
  }

  selectSuggestion(suggestion: string): void {
    const { context, plugin } = this;
    if (!context) return;

    const field = BC_FIELDS_INFO.find((f) => f.field === suggestion);
    const replacement = `${suggestion}${field?.[isInsideYaml() ? "afterYaml" : "afterInline"]
      }`;

    context.editor.replaceRange(
      replacement,
      { ch: 0, line: context.start.line },
      context.end
    );
  }
}
