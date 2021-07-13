<script lang="ts">
import type { App,TFile,View } from "obsidian";
import type BreadcrumbsPlugin from "src/main";
import { closeImpliedLinks, normalise, openOrSwitch,padArray,runs,transpose } from "src/sharedFunctions";

export let sortedTrails: string[][]
export let app: App;
export let plugin: BreadcrumbsPlugin;

const settings = plugin.settings;

const currFile = app.workspace.getActiveFile();
const activeLeafView = app.workspace.activeLeaf.view;

function resolvedClass(toFile: string, currFile: TFile): string {
    return app.metadataCache.unresolvedLinks[currFile.path][toFile] > 0
        ? "internal-link is-unresolved breadcrumbs-link"
        : "internal-link breadcrumbs-link";
    }

function hoverPreview(event: MouseEvent, view: View): void {
  const targetEl = event.target as HTMLElement;

  view.app.workspace.trigger("hover-link", {
    event,
    source: view.getViewType(),
    hoverParent: view,
    targetEl,
    linktext: targetEl.innerText,
  });
}

const allCells = [... new Set(sortedTrails.reduce((a, b) => [...a, ...b]))]

// const data: {[cell: string]: number} = {}
// allCells.forEach(cell => data[cell] = app.metadataCache.getFileCache(app.metadataCache.getFirstLinkpathDest(cell, currFile.path))?.links.length ?? 0);

const children: {[cell: string]: number} = {};
allCells.forEach(cell => children[cell] = (closeImpliedLinks(plugin.currGraphs.gChildren, plugin.currGraphs.gParents).successors(cell) ?? []).length)

const normalisedData = normalise(Object.values(children));
allCells.forEach((cell, i) => {
    children[cell] = normalisedData[i]
})
console.log(children);
// const normalisedData = allCells.forEach(cell => {
// })

// const links: {[cell: string]: number}[] = []
// data.forEach(cell => links[Object.keys(cell)[0]] = (Object.values(cell)[0]?.links.length ?? 0))

// console.log(data)

const maxLength = Math.max(...sortedTrails.map(trail => trail.length))
const paddedTrails: string[][] = sortedTrails.map(trail => padArray(trail, maxLength))

// const permutations: string[][][] = permute(paddedTrails.map(trail => [trail[0]]))

// //  permutations.map(trails => sum(transpose(trails).map(runs).map(runs => runs.length)))

// const ALLRuns = permutations.map(permutation => transpose(permutation).map(runs))
// const runsPerRun = ALLRuns.map(runs => runs[0].length)
// const minRunLength = Math.min(...runsPerRun);
// const indexOfMinRun = runsPerRun.indexOf(minRunLength);
// const minRun = ALLRuns[indexOfMinRun]

const transposedTrails: string[][] = transpose(paddedTrails);
const allRuns = transposedTrails.map(runs);

const intToCol = (int:number) => ('#' + int.toString(16).padStart(6, '0'));
// allRuns.forEach(run => console.log(intToCol(data[run[0].value])))


// debug(settings, {maxLength, paddedTrails, transposedTrails, permutations, ALLRuns, runsPerRun, minRunLength: Math.min(...runsPerRun), minRun})

</script>

<div class="breadcrumbs-trail-grid" style="
    grid-template-columns: {'1fr '.repeat(transposedTrails.length)};
    grid-template-rows: {'1fr '.repeat(sortedTrails.length)}">

{#each transposedTrails as col, i}

    {#each allRuns[i] as step}
        <div 
        class="breadcrumbs-trail-grid-item 
            {resolvedClass(step.value, currFile)} 
            {step.value === '' ? 'breadcrumbs-filler' : ''}" 
        
        style="
            grid-area: {step.first + 1} / {i + 1} / 
                {step.last + 2} / {i + 2};
            {settings.gridHeatmap 
                ? `background-color: ${settings.heatmapColour}${Math.round((children[step.value] * 200) + 55).toString(16)}` 
                : ''}"

        on:click={(e) => 
            openOrSwitch(app, step.value, currFile, e)
        } 
        on:mouseover={(e) => hoverPreview(e,activeLeafView)}>
            {step.value}
        </div>
    {/each}

{/each}
</div>


<style>

div.breadcrumbs-trail-grid {
    border: 2px solid var(--background-modifier-border);
    display: grid;
    align-items: stretch;
    width: auto;
    height: auto;
}

div.breadcrumbs-trail-grid-item {
    display: flex;
    border: 1px solid var(--background-modifier-border);
    align-items: center;
    justify-content: center;
    padding: 2px;
    font-size: smaller;
    /* height: auto; */
}

div.breadcrumbs-trail-grid-item.breadcrumbs-filler {
    opacity: 0.7;
}

</style>