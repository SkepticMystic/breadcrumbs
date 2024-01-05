import {
  Editor,
  EditorPosition,
  EditorSuggest,
  EditorSuggestContext,
  EditorSuggestTriggerInfo,
  TFile,
} from "obsidian";
import { isInsideYaml } from "./Utils/ObsidianUtils";
import type BCPlugin from "./main";
import { escapeRegex } from "./Utils/generalUtils";
import { getFields } from "./Utils/HierUtils";

export class RelationSuggestor extends EditorSuggest<string> {
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
    const trig = this.plugin.settings.relSuggestorTrigger;
    const sub = editor.getLine(cursor.line).substring(0, cursor.ch);

    const regex = new RegExp(`.*?${escapeRegex(trig)}(.*)$`);
    const match = regex.exec(sub)?.[1];

    if (match === undefined) return null;
    return {
      start: {
        ch: sub.lastIndexOf(trig),
        line: cursor.line,
      },
      end: cursor,
      query: match,
    };
  }

  getSuggestions = (context: EditorSuggestContext) => {
    const { query } = context;
    const { userHiers } = this.plugin.settings;
    return getFields(userHiers).filter((sug) => sug.includes(query));
  };

  renderSuggestion(suggestion: string, el: HTMLElement): void {
    el.createDiv({
      text: suggestion,
      cls: "codeblock-suggestion",
    });
  }

  selectSuggestion(suggestion: string): void {
    const { context, plugin } = this;
    if (!context) return

    const trig = plugin.settings.relSuggestorTrigger;
    const { start, end, editor } = context;

    const replacement = suggestion + (isInsideYaml() ? ": " : ":: ") + '[[';
    editor.replaceRange(
      replacement,
      { ch: start.ch + 1 - trig.length, line: start.line },
      end
    );
  }
}
