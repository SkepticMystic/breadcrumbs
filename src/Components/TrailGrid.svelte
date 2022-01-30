<script lang="ts">
  import { range } from "lodash";
  import { warn } from "loglevel";
  import {
    hoverPreview,
    openOrSwitch,
  } from "obsidian-community-lib/dist/utils";
  import type BCPlugin from "../main";
  import {
    dropDendron,
    normalise,
    padArray,
    runs,
    transpose,
  } from "../Utils/generalUtils";
  import {
    getOutNeighbours,
    getReflexiveClosure,
    getSubInDirs,
  } from "../Utils/graphUtils";
  import { getAlt, linkClass } from "../Utils/ObsidianUtils";

  export let sortedTrails: string[][];
  export let plugin: BCPlugin;

  const { settings, app } = plugin;
  const { userHiers, gridHeatmap, heatmapColour, gridDots, dotsColour } =
    settings;

  const currFile = app.workspace.getActiveFile();
  const activeLeafView = app.workspace.activeLeaf.view;

  const allCells = [...new Set(sortedTrails.flat())];

  const wordCounts: { [cell: string]: number } = {};
  allCells.forEach((cell) => {
    try {
      wordCounts[cell] = app.metadataCache.getFirstLinkpathDest(
        cell,
        ""
      )?.stat.size;
    } catch (error) {
      warn(error, { currFile });
      wordCounts[cell] = 0;
    }
  });

  const { mainG } = plugin;

  const closedParents = getReflexiveClosure(
    getSubInDirs(mainG, "up", "down"),
    userHiers
  );

  const children: { [cell: string]: number } = {};
  allCells.forEach(
    (cell) => (children[cell] = getOutNeighbours(closedParents, cell).length)
  );

  const normalisedData = normalise(Object.values(children));
  allCells.forEach((cell, i) => {
    children[cell] = normalisedData[i];
  });

  const maxLength = Math.max(...sortedTrails.map((trail) => trail.length));
  const paddedTrails: string[][] = sortedTrails.map((trail) =>
    padArray(trail, maxLength)
  );

  const transposedTrails = transpose(paddedTrails);
  const allRuns = transposedTrails.map(runs);

  const toColour = (value: string) =>
    heatmapColour + Math.round(children[value] * 200 + 55).toString(16);
</script>

<div
  class="BC-trail-grid"
  style="
    grid-template-columns: {'1fr '.repeat(transposedTrails.length)};
    grid-template-rows: {'1fr '.repeat(sortedTrails.length)}"
>
  {#each transposedTrails as col, i}
    {#each allRuns[i] as { value, first, last }}
      <div
        class="BC-trail-grid-item {value === '' ? 'BC-filler' : ''}"
        style="
            grid-area: {first + 1} / {i + 1} / 
                {last + 2} / {i + 2};
            {gridHeatmap ? `background-color: ${toColour(value)}` : ''}"
        on:click={async (e) => await openOrSwitch(app, value, e)}
        on:mouseover={(e) => hoverPreview(e, activeLeafView, value)}
      >
        <div class={linkClass(app, value)}>
          {getAlt(value, plugin) ?? dropDendron(value, settings)}
        </div>
        {#if value && gridDots}
          <div class="dots">
            {#each range(Math.floor(wordCounts[value] / 1000)) as _}
              <span class="dot" style="background-color: {dotsColour}" />
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  {/each}
</div>

<style>
  div.BC-trail-grid {
    border: 2px solid var(--background-modifier-border);
    display: grid;
    align-items: stretch;
    width: auto;
    height: auto;
  }

  div.BC-trail-grid-item {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--background-modifier-border);
    align-items: center;
    justify-content: center;
    padding: 2px;
    font-size: smaller;
  }

  div.BC-trail-grid-item.BC-filler {
    opacity: 0.7;
  }

  .dot {
    height: 5px;
    width: 5px;
    border-radius: 50%;
    display: inline-block;
  }
</style>
