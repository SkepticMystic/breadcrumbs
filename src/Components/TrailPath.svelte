<script lang="ts">
  import type { App } from "obsidian";
  import {
    hoverPreview,
    openOrSwitch,
  } from "obsidian-community-lib/dist/utils";
  import type BCPlugin from "src/main";

  export let sortedTrails: string[][];
  export let app: App;
  export let plugin: BCPlugin;

  const { settings } = plugin;
  const { view } = app.workspace.activeLeaf;

  let showAll = settings.showAll;

  $: trailsToShow = showAll ? sortedTrails : [sortedTrails[0]];
</script>

<span class="BC-trail-path-container">
  <div class="trails-div">
    {#each trailsToShow as trail}
      <div>
        {#if trail.length === 0}
          <span>{settings.noPathMessage}</span>
        {:else}
          {#each trail as crumb, i}
            <span
              class="internal-link BC-Link"
              on:click={async (e) => await openOrSwitch(app, crumb, e)}
              on:mouseover={(e) => hoverPreview(e, view, crumb)}
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
        {showAll ? "Shortest" : "All"}
      </button>
    </div>
  {/if}
</span>

<style>
  span.BC-trail-path-container {
    display: flex;
    justify-content: space-between;
  }
</style>
