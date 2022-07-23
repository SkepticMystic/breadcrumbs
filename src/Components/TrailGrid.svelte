<script lang="ts">
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
  import { getReflexiveClosure, getSubInDirs } from "../Utils/graphUtils";
  import { getAlt, linkClass } from "../Utils/ObsidianUtils";

  export let sortedTrails: string[][];
  export let plugin: BCPlugin;

  const { settings, mainG } = plugin;
  const { userHiers, gridHeatmap, heatmapColour, gridDefaultDepth } = settings;

  const activeLeafView = app.workspace.activeLeaf.view;

  const allCells = [...new Set(sortedTrails.flat())];

  const closedParents = getReflexiveClosure(
    getSubInDirs(mainG, "up", "down"),
    userHiers
  );

  const children: { [cell: string]: number } = {};
  allCells.forEach((cell) => (children[cell] = closedParents.outDegree(cell)));

  const normalisedData = normalise(Object.values(children));
  allCells.forEach((cell, i) => {
    children[cell] = normalisedData[i];
  });

  const maxLength = sortedTrails.last().length;

  // Use the user setting to limit the initial depth
  let depth = Math.min(maxLength, gridDefaultDepth);

  let slicedTrails = sortedTrails;
  $: {
    slicedTrails = [];
    sortedTrails.forEach((trail) => {
      const slice = trail.slice(maxLength - depth);
      if (slice.length) slicedTrails.push(slice);
    });
  }

  $: paddedTrails = slicedTrails.map((trail) => padArray(trail, depth));

  $: transposedTrails = transpose(paddedTrails);
  $: allRuns = transposedTrails.map(runs);

  const toColour = (value: string) =>
    heatmapColour + Math.round(children[value] * 200 + 55).toString(16);
</script>

<div class="BC-grid-wrapper">
  <div
    class="BC-trail-grid"
    style="
      grid-template-columns: {'1fr '.repeat(transposedTrails.length)};
      grid-template-rows: {'1fr '.repeat(slicedTrails.length)}"
  >
    {#each transposedTrails as col, i}
      {#each allRuns[i] as { value, first, last }}
        <div
          class="BC-trail-grid-item {value === '' ? 'BC-filler' : ''}"
          style="
              grid-area: {first + 1} / {i + 1} /
                  {last + 2} / {i + 2};
              {gridHeatmap ? `background-color: ${toColour(value)}` : ''}"
          on:click={async (e) => await openOrSwitch(value, e)}
          on:mouseover={(e) => hoverPreview(e, activeLeafView, value)}
        >
          <div class={linkClass(value)}>
            {getAlt(value, plugin) ?? dropDendron(value, settings)}
          </div>
        </div>
      {/each}
    {/each}
  </div>

  <div class="BC-grid-options">
    <span>
      <span class="BC-grid-options-icon">⚙️</span>

      <span class="BC-grid-options-options">
        <button
          class="BC-depth-button"
          disabled={depth === 1}
          on:click={() => (depth -= 1)}>-</button
        >
        <span class="tree-item-flair">{depth}</span>
        <button
          class="BC-depth-button"
          disabled={depth === maxLength}
          on:click={() => (depth += 1)}>+</button
        >
      </span>
    </span>
  </div>
</div>

<style>
  div.BC-grid-wrapper {
    position: relative;
  }

  div.BC-trail-grid {
    border: 2px solid var(--background-modifier-border);
    display: grid;
    align-items: stretch;
    width: auto;
    height: auto;
  }

  .BC-grid-options {
    position: absolute;
    top: 0px;
    right: 0px;
    height: 35px;
    width: 32px;

    border: 1px solid var(--background-modifier-border);
    border-radius: 10px;

    text-align: center;

    transition: width 0.3s;
    overflow-wrap: normal;
    overflow: hidden;
  }
  div.BC-grid-options:hover {
    padding: 5px;
    width: fit-content;
  }
  div.BC-grid-options:hover .BC-grid-options-icon {
    display: none;
  }

  .BC-grid-options-options {
    display: none;
  }
  div.BC-grid-options:hover .BC-grid-options-options {
    display: unset;
  }

  .BC-depth-button {
    padding: 3px 5px;
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

  /* .dot {
    height: 5px;
    width: 5px;
    border-radius: 50%;
    display: inline-block;
  } */
</style>
