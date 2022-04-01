import type { MultiGraph } from "graphology";
import { error, info } from "loglevel";
import { MarkdownView, Notice, TFile } from "obsidian";
import NextPrev from "../Components/NextPrev.svelte";
import TrailGrid from "../Components/TrailGrid.svelte";
import TrailPath from "../Components/TrailPath.svelte";
import {
  BC_HIDE_TRAIL,
  blankRealNImplied,
  JUGGL_TRAIL_DEFAULTS,
} from "../constants";
import type { BCSettings, EdgeAttr, RealNImplied } from "../interfaces";
import type BCPlugin from "../main";
import {
  bfsAllPaths,
  getReflexiveClosure,
  getSubForFields,
  getSubInDirs,
} from "../Utils/graphUtils";
import { getFields, getOppDir, getOppFields } from "../Utils/HierUtils";
import { createJugglTrail } from "../Visualisations/Juggl";

function getLimitedTrailSub(plugin: BCPlugin) {
  const { settings, mainG, closedG } = plugin;
  const { limitTrailCheckboxes, userHiers } = settings;

  if (
    getFields(userHiers).every((field) => limitTrailCheckboxes.includes(field))
  ) {
    return getSubInDirs(closedG, "up");
  } else {
    const oppFields = limitTrailCheckboxes
      .map((field) => getOppFields(userHiers, field, "up")?.[0])
      .filter((field) => field !== undefined);
    const subGraph = getSubForFields(mainG, [
      ...limitTrailCheckboxes,
      ...oppFields,
    ]);
    const closed = getReflexiveClosure(subGraph, userHiers);
    return getSubInDirs(closed, "up");
  }
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

function getNextNPrev(plugin: BCPlugin, currNode: string) {
  const { mainG } = plugin;
  const { userHiers } = plugin.settings;
  if (!mainG) return null;
  const nextNPrev: RealNImplied = blankRealNImplied();

  mainG.forEachEdge(currNode, (k, a, s, t) => {
    const { dir, field, implied } = a as EdgeAttr;
    if (dir !== "next" && dir !== "prev") return;
    if (s === currNode) {
      nextNPrev[dir].reals.push({ field, to: t, implied });
    } else {
      const oppField = getOppFields(userHiers, field, dir)[0];
      nextNPrev[getOppDir(dir)].implieds.push({
        field: oppField,
        to: s,
        implied,
      });
    }
  });
  return nextNPrev;
}

export async function drawTrail(plugin: BCPlugin): Promise<void> {
  try {
    const { settings, db, app, mainG } = plugin;
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
    const activeMDView = app.workspace.getActiveViewOfType(MarkdownView);
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

    const { basename } = file;
    if (!mainG.hasNode(basename)) {
      db.end2G();
      return;
    }

    const view =
      mode === "preview"
        ? activeMDView.previewMode.containerEl.querySelector(
            "div.markdown-preview-view"
          )
        : activeMDView.contentEl.querySelector("div.markdown-source-view");

    activeMDView.containerEl
      .querySelectorAll(".BC-trail")
      ?.forEach((trail) => trail.remove());

    const closedUp = getLimitedTrailSub(plugin);
    const sortedTrails = getBreadcrumbs(settings, closedUp, file);
    info({ sortedTrails });

    const {
      next: { reals: rNext, implieds: iNext },
      prev: { reals: rPrev, implieds: iPrev },
    } = getNextNPrev(plugin, basename);

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
      : "100%";

    const trailDiv = createDiv({
      cls: `BC-trail ${
        respectReadableLineLength
          ? "is-readable-line-width markdown-preview-sizer markdown-preview-section"
          : ""
      }`,
      attr: {
        style:
          (mode !== "preview" ? `max-width: ${max_width};` : "") +
          "margin: 0 auto;",
      },
    });

    plugin.visited.push([file.path, trailDiv]);

    if (mode === "preview") {
      view.querySelector("div.markdown-preview-sizer").before(trailDiv);
    } else {
      const cmEditor = view.querySelector("div.cm-contentContainer");
      const cmGutter = view.querySelector("div.cm-gutters");
      if (cmEditor) {
        cmEditor.firstChild?.before(trailDiv);
      }
      // set padding top of gutter to match height of trailDiv
      if (cmGutter) {
        requestAnimationFrame(() => {
          const gutterHeight = trailDiv.getBoundingClientRect().height;
          cmGutter.style.paddingTop = `${gutterHeight + 4}px`;
        });
      }
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

    const targetProps = {
      target: trailDiv,
      props: { sortedTrails, plugin },
    };

    if (showTrail && sortedTrails.length) new TrailPath(targetProps);
    if (showGrid && sortedTrails.length) new TrailGrid(targetProps);
    if (showPrevNext && (next.length || prev.length)) {
      new NextPrev({
        target: trailDiv,
        props: { plugin, next, prev },
      });
    }
    if (showJuggl && sortedTrails.length) {
      createJugglTrail(
        plugin,
        trailDiv,
        sortedTrails,
        basename,
        JUGGL_TRAIL_DEFAULTS
      );
    }
    db.end2G();
  } catch (err) {
    error(err);
    plugin.db.end2G();
  }
}
