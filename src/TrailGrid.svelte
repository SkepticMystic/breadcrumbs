<script lang="ts">
import type { App,TFile } from "obsidian";
import type { BreadcrumbsSettings } from "src/interfaces";
import { debug,openOrSwitch,padArray,transpose } from "src/sharedFunctions";


export let sortedTrails: string[][]
export let app: App;
export let settings: BreadcrumbsSettings;

const currFile = app.workspace.getActiveFile();

function resolvedClass(toFile: string, currFile: TFile): string {
    return app.metadataCache.unresolvedLinks[currFile.path][toFile] > 0
      ? "internal-link is-unresolved breadcrumbs-link"
      : "internal-link breadcrumbs-link";
  }

const maxLength = sortedTrails.last().length
const paddedTrails: string[][] = sortedTrails.map(trail => padArray(trail, maxLength))
const transposedTrails: string[][] = transpose(paddedTrails);
const uniqueValuesPerCol = transposedTrails.map(trail => [...new Set(trail)])

debug(settings, {maxLength, paddedTrails, transposedTrails, uniqueValuesPerCol})

</script>

<div class="breadcrumbs-trail-grid" style="
    grid-template-columns: {'1fr '.repeat(transposedTrails.length)};
    grid-template-rows: {'1fr '.repeat(sortedTrails.length)}">
{#each transposedTrails as col, i}

    {#each uniqueValuesPerCol[i] as step}
        <div 
        class="breadcrumbs-trail-grid-item 
            {resolvedClass(step, currFile)} 
            {step === '' ? 'breadcrumbs-filler' : ''}" 
        
        style="
            grid-area: {col.indexOf(step) + 1} / {i + 1} / 
                {col.lastIndexOf(step) + 2} / {i + 2};"
        on:click="{(e) => 
            openOrSwitch(app, step, currFile, e)
        }">
            {step}
        </div>
    {/each}

{/each}
</div>


<style>

div.breadcrumbs-trail-grid {
    border: 3px solid var(--background-modifier-border);
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
    padding: 5px;
    height: auto;
}

div.breadcrumbs-trail-grid-item.breadcrumbs-filler {
    opacity: 0.7;
}

</style>