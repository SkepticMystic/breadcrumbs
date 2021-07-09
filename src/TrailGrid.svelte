<script lang="ts">
import type { App,TFile,View } from "obsidian";
import type { BreadcrumbsSettings } from "src/interfaces";
import { debug,openOrSwitch,padArray,runs,transpose } from "src/sharedFunctions";

export let sortedTrails: string[][]
export let app: App;
export let settings: BreadcrumbsSettings;

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

const maxLength = Math.max(...sortedTrails.map(trail => trail.length))
const paddedTrails: string[][] = sortedTrails.map(trail => padArray(trail, maxLength))
const transposedTrails: string[][] = transpose(paddedTrails);
const allRuns = transposedTrails.map(runs);

debug(settings, {maxLength, paddedTrails, transposedTrails, runs: allRuns})

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
                {step.last + 2} / {i + 2};"

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