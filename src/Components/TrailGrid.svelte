<script lang="ts">
  import { range } from "lodash";
  import type { App } from "obsidian";
  import {
    hoverPreview,
    openOrSwitch,
  } from "obsidian-community-lib/dist/utils";
  import type BCPlugin from "../main";
  import {
    dropDendron,
    linkClass,
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
  import { getAlt } from "../Utils/ObsidianUtils";
  export let sortedTrails: string[][];
  export let app: App;
  export let plugin: BCPlugin;

  const { settings } = plugin;
  const { userHiers } = settings;

  const currFile = app.workspace.getActiveFile();
  const activeLeafView = app.workspace.activeLeaf.view;

  const allCells = [...new Set(sortedTrails.reduce((a, b) => [...a, ...b]))];

  const wordCounts: { [cell: string]: number } = {};
  allCells.forEach((cell) => {
    try {
      wordCounts[cell] = app.metadataCache.getFirstLinkpathDest(
        cell,
        ""
      )?.stat.size;
    } catch (error) {
      console.log(error, { currFile });
      wordCounts[cell] = 0;
    }
  });

  // const data: {[cell: string]: number} = {}
  // allCells.forEach(cell => data[cell] = app.metadataCache.getFileCache(app.metadataCache.getFirstLinkpathDest(cell, currFile.path))?.links.length ?? 0);

  const { mainG } = plugin;
  // const [up, down] = [getSubInDirs(mainG, "up"), getSubInDirs(mainG, "down")];

  // const closedParents = closeImpliedLinks(up, down);

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
  // const normalisedData = allCells.forEach(cell => {
  // })

  // const links: {[cell: string]: number}[] = []
  // data.forEach(cell => links[Object.keys(cell)[0]] = (Object.values(cell)[0]?.links.length ?? 0))

  // console.log(data)

  const maxLength = Math.max(...sortedTrails.map((trail) => trail.length));
  const paddedTrails: string[][] = sortedTrails.map((trail) =>
    padArray(trail, maxLength)
  );

  // const permutations: string[][][] = permute(paddedTrails.map(trail => [trail[0]]))

  // //  permutations.map(trails => sum(transpose(trails).map(runs).map(runs => runs.length)))

  // const ALLRuns = permutations.map(permutation => transpose(permutation).map(runs))
  // const runsPerRun = ALLRuns.map(runs => runs[0].length)
  // const minRunLength = Math.min(...runsPerRun);
  // const indexOfMinRun = runsPerRun.indexOf(minRunLength);
  // const minRun = ALLRuns[indexOfMinRun]

  const transposedTrails: string[][] = transpose(paddedTrails);
  const allRuns = transposedTrails.map(runs);

  const intToCol = (int: number) => "#" + int.toString(16).padStart(6, "0");
  // allRuns.forEach(run => console.log(intToCol(data[run[0].value])))

  // debug(settings, {maxLength, paddedTrails, transposedTrails, permutations, ALLRuns, runsPerRun, minRunLength: Math.min(...runsPerRun), minRun})
</script>

<div
  class="BC-trail-grid"
  style="
    grid-template-columns: {'1fr '.repeat(transposedTrails.length)};
    grid-template-rows: {'1fr '.repeat(sortedTrails.length)}"
>
  {#each transposedTrails as col, i}
    {#each allRuns[i] as step}
      <div
        class="BC-trail-grid-item {step.value === '' ? 'BC-filler' : ''}"
        style="
            grid-area: {step.first + 1} / {i + 1} / 
                {step.last + 2} / {i + 2};
            {settings.gridHeatmap
          ? `background-color: ${settings.heatmapColour}${Math.round(
              children[step.value] * 200 + 55
            ).toString(16)}`
          : ''}"
        on:click={(e) => openOrSwitch(app, step.value, e)}
        on:mouseover={(e) => hoverPreview(e, activeLeafView, step.value)}
      >
        <div class={linkClass(app, step.value)}>
          {getAlt(step.value, plugin) ?? dropDendron(step.value, settings)}
        </div>
        {#if step.value && settings.gridDots}
          <div class="dots">
            {#each range(Math.floor(wordCounts[step.value] / 1000)) as i}
              <span
                class="dot"
                style="background-color: {settings.dotsColour}"
              />
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
    /* height: fit-content; */
    /* height: auto; */
  }

  div.BC-trail-grid-item.BC-filler {
    opacity: 0.7;
  }

  /* .dots {
    height: 10px;
  } */
  .dot {
    height: 5px;
    width: 5px;
    border-radius: 50%;
    display: inline-block;
  }
</style>
