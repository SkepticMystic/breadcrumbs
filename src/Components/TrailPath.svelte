<script lang="ts">
  import type { App, TFile } from "obsidian";
  import { hoverPreview } from "obsidian-community-lib";
  import type { BreadcrumbsSettings } from "src/interfaces";
  import { openOrSwitch } from "src/sharedFunctions";

  export let sortedTrails: string[][];
  export let app: App;
  export let settings: BreadcrumbsSettings;
  export let currFile: TFile;

  const activeLeafView = app.workspace.activeLeaf.view;

  let showAll = settings.showAll;
  $: buttonText = showAll ? "Shortest" : "All";
  $: trailsToShow = showAll ? sortedTrails : [sortedTrails[0]];
</script>

<span class="breadcrumbs-trail-path-container">
  <div class="trails-div">
    {#each trailsToShow as trail}
      <div>
        {#if trail.length === 0}
          <span>{settings.noPathMessage}</span>
        {:else}
          {#each trail as crumb, i}
            <span
              class="internal-link breadcrumbs-link"
              on:click={async (e) =>
                await openOrSwitch(app, crumb, currFile, e)}
              on:mouseover={(e) => hoverPreview(e, activeLeafView, crumb)}
            >
              {crumb}
            </span>
            {#if i < trail.length - 1}
              <span>{" " + settings.trailSeperator + " "}</span>
            {/if}
          {/each}
        {/if}
      </div>
    {/each}
  </div>

  {#if sortedTrails.length > 1}
    <div>
      <button class="button-div" on:click={() => (showAll = !showAll)}>
        {buttonText}
      </button>
    </div>
  {/if}
</span>

<style>
  span.breadcrumbs-trail-path-container {
    display: flex;
    justify-content: space-between;
  }
</style>
