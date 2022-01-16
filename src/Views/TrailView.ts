import type { MultiGraph } from "graphology";
import { error, info } from "loglevel";
import { MarkdownView, Notice, TFile, editorViewField } from "obsidian";
import type { BCSettings } from "../interfaces";
import NextPrev from "../Components/NextPrev.svelte";
import TrailGrid from "../Components/TrailGrid.svelte";
import TrailPath from "../Components/TrailPath.svelte";
import { BC_HIDE_TRAIL, JUGGL_TRAIL_DEFAULTS } from "../constants";
import {
  bfsAllPaths,
  getOppFields,
  getReflexiveClosure,
  getSubForFields,
  getSubInDirs,
} from "../graphUtils";
import type BCPlugin from "../main";
import { getFields, getRealnImplied } from "../sharedFunctions";
import {createJugglTrail} from "../Visualisations/Juggl";
import {Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType} from "@codemirror/view";
import {RangeSet, RangeSetBuilder} from "@codemirror/rangeset";

let UPDATE_LP_VIEW = false;

export function updateLPView() {
  UPDATE_LP_VIEW = true;
}

export function buildCMPlugin(plugin: BCPlugin) {
  class TrailWidget extends WidgetType {
    element: HTMLElement;
    constructor(element: HTMLElement) {
      super();
      this.element = element;
    }

    toDOM(view: EditorView): HTMLElement {
      console.log("TO the doM!");
      this.element.detach();
      return this.element;
    }

    ignoreEvent(_event: Event): boolean {
      return true;
    }
  }

  return ViewPlugin.fromClass(
      class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
          this.decorations = new RangeSetBuilder<Decoration>().finish();
          this.buildDecorations(view).then(value => {this.decorations = value;});
        }

        update(update: ViewUpdate) {
          if (UPDATE_LP_VIEW) {
            this.buildDecorations(update.view).then(value => {this.decorations = value;});
            UPDATE_LP_VIEW = false;
          }
        }

        destroy() {}

        async buildDecorations(view: EditorView) {
          let builder = new RangeSetBuilder<Decoration>();
          if (plugin.settings.showBCsInEditLPMode) {
            let mdView: MarkdownView = view.state.field(editorViewField);
            let element = await _drawTrail(plugin, mdView);
            let widget = Decoration.widget({
              widget: new TrailWidget(element)
            });
            builder.add(0, 0, widget);
          }
          return builder.finish();
        }
      },
      {
        decorations: v => v.decorations
      }
  )
}

function getLimitedTrailSub(plugin: BCPlugin) {
  const { settings, mainG } = plugin;
  const { limitTrailCheckboxes, userHiers } = settings;
  let subGraph: MultiGraph;

  if (
    getFields(userHiers).every((field) => limitTrailCheckboxes.includes(field))
  ) {
    subGraph = getSubInDirs(mainG, "up", "down");
  } else {
    const oppFields = limitTrailCheckboxes
      .map((field) => getOppFields(userHiers, field)[0])
      .filter((field) => field !== undefined);
    subGraph = getSubForFields(mainG, [...limitTrailCheckboxes, ...oppFields]);
  }

  const closed = getReflexiveClosure(subGraph, userHiers);
  return getSubInDirs(closed, "up");
}

function getBreadcrumbs(
  settings: BCSettings,
  g: MultiGraph,
  currFile: TFile
): string[][] | null {
  const { basename, extension } = currFile;
  if (extension !== "md") return null;

  const allTrails = bfsAllPaths(g, basename);
  let filteredTrails = [...allTrails];

  const { indexNotes, showAllPathsIfNoneToIndexNote } = settings;
  // Filter for index notes
  if (
    // Works for `undefined` and `""`
    indexNotes[0] &&
    filteredTrails.length
  ) {
    filteredTrails = filteredTrails.filter((trail) =>
      indexNotes.includes(trail[0])
    );
    if (filteredTrails.length === 0 && showAllPathsIfNoneToIndexNote)
      filteredTrails = [...allTrails];
  }

  const sortedTrails = filteredTrails
    .filter((trail) => trail.length > 0)
    .sort((a, b) => a.length - b.length);

  return sortedTrails;
}

export async function drawTrail(plugin: BCPlugin): Promise<void> {
  const activeMDView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
  console.log(activeMDView.getMode());
  if (activeMDView.getMode() !== "preview") {
    return;
  }
  await _drawTrail(plugin, activeMDView);
}

async function _drawTrail(plugin: BCPlugin, activeMDView: MarkdownView): Promise<HTMLElement> {
  try {
    const { settings, db, app } = plugin;
    const {
      showBCs,
      noPathMessage,
      respectReadableLineLength,
      showTrail,
      showGrid,
      showJuggl,
      showPrevNext,
      showBCsInEditLPMode,
    } = settings;
    db.start2G("drawTrail");

    const mode = activeMDView?.getMode();
    if (
      !showBCs ||
      !activeMDView ||
      (mode !== "preview" && !showBCsInEditLPMode)
    ) {
      activeMDView?.containerEl.querySelector(".BC-trail")?.remove();
      db.end2G();
      return;
    }

    const { file } = activeMDView;
    const { frontmatter } = app.metadataCache.getFileCache(file) ?? {};

    // @ts-ignore
    const { hideTrailField } = settings;
    if (hideTrailField && frontmatter?.[hideTrailField]) {
      new Notice(
        `${file.basename} still uses an old frontmatter field to hide it's trail. This settings has been deprecated in favour of a standardised field: 'BC-hide-trail'. Please change it so that this note's trail is hidden again.`
      );
    }
    if (frontmatter?.[BC_HIDE_TRAIL] || frontmatter?.["kanban-plugin"]) {
      db.end2G();
      return;
    }

    let view: HTMLElement;
    let livePreview: boolean = false;
    if (mode === "preview") {
      view = activeMDView.previewMode.containerEl.querySelector(
        "div.markdown-preview-view"
      );
      activeMDView.containerEl
          .querySelectorAll(".BC-trail")
          ?.forEach((trail) => trail.remove());
    }
    else {
      view = activeMDView.contentEl.querySelector("div.markdown-source-view");
      if (view.hasClass("is-live-preview")) livePreview = true;
    }



    const closedUp = getLimitedTrailSub(plugin);
    const sortedTrails = getBreadcrumbs(settings, closedUp, file);
    info({ sortedTrails });

    const { basename } = file;

    const {
      next: { reals: rNext, implieds: iNext },
      prev: { reals: rPrev, implieds: iPrev },
    } = getRealnImplied(plugin, basename, "next");

    // Remove duplicate implied
    const next = [...rNext];
    iNext.forEach((i) => {
      if (next.findIndex((n) => n.to === i.to) === -1) {
        next.push(i);
      }
    });
    const prev = [...rPrev];
    iPrev.forEach((i) => {
      if (prev.findIndex((n) => n.to === i.to) === -1) {
        prev.push(i);
      }
    });

    const noItems = !sortedTrails.length && !next.length && !prev.length;

    if (noItems && noPathMessage === "") {
      db.end2G();
      return;
    }

    const selectorForMaxWidth =
      mode === "preview"
        ? ".markdown-preview-view.is-readable-line-width .markdown-preview-sizer"
        : "";

    const elForMaxWidth =
      selectorForMaxWidth !== ""
        ? document.querySelector(selectorForMaxWidth)
        : null;
    const max_width = elForMaxWidth
      ? getComputedStyle(elForMaxWidth).getPropertyValue("max-width")
      : "80%";

    const trailDiv = createDiv({
      cls: `BC-trail ${
        respectReadableLineLength
          ? "is-readable-line-width markdown-preview-sizer markdown-preview-section"
          : ""
      }`,
      attr: {
        style:
          (mode !== "preview" ? `max-width: ${max_width};` : "") +
          "margin: 0 auto",
      },
    });

    plugin.visited.push([file.path, trailDiv]);

    if (mode === "preview") {
      view.querySelector("div.markdown-preview-sizer").before(trailDiv);
    } else {
      const cmEditor = view.querySelector("div.cm-editor");
      const cmSizer = view.querySelector("div.CodeMirror-sizer");
      if (cmEditor) cmEditor.firstChild?.before(trailDiv);
      if (cmSizer) cmSizer.before(trailDiv);
    }


    trailDiv.empty();
    if (settings.indexNotes.includes(basename)) {
      trailDiv.innerText = "Index Note";
      db.end2G();
      return;
    }

    if (noItems) {
      trailDiv.innerText = noPathMessage;
      db.end2G();
      return;
    }

    const props = { sortedTrails, app, plugin };

    if (showTrail && sortedTrails.length) {
      new TrailPath({
        target: trailDiv,
        props,
      });
    }
    if (showGrid && sortedTrails.length) {
      new TrailGrid({
        target: trailDiv,
        props,
      });
    }
    if (showPrevNext && (next.length || prev.length)) {
      new NextPrev({
        target: trailDiv,
        props: { app, plugin, next, prev },
      });
    }
    if (showJuggl && sortedTrails.length) {
      createJugglTrail(
        plugin,
        trailDiv,
        props.sortedTrails,
        basename,
        JUGGL_TRAIL_DEFAULTS
      );
    }
    db.end2G();
    return trailDiv;
  } catch (err) {
    error(err);
    plugin.db.end2G();
  }
}
