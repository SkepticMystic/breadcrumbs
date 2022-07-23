<script lang="ts">
  import { info } from "loglevel";
  import {
    hoverPreview,
    isInVault,
    openOrSwitch,
  } from "obsidian-community-lib";
  import FaFire from "svelte-icons/fa/FaFire.svelte";
  import FaRegSnowflake from "svelte-icons/fa/FaRegSnowflake.svelte";
  import { createIndex, indexToLinePairs } from "../Commands/CreateIndex";
  import { DIRECTIONS } from "../constants";
  import type { Directions } from "../interfaces";
  import type BCPlugin from "../main";
  import { refreshIndex } from "../refreshIndex";
  import { dropDendron } from "../Utils/generalUtils";
  import { dfsAllPaths, getSubInDirs } from "../Utils/graphUtils";
  import type TreeView from "../Views/TreeView";
  import { getCurrFile } from "../Utils/ObsidianUtils";

  export let plugin: BCPlugin;
  export let view: TreeView;

  const { settings, app, closedG } = plugin;
  const { createIndexIndent } = settings;

  let dir: Directions = "down";
  let frozen = false;
  let { basename } = getCurrFile();

  plugin.registerEvent(
    app.workspace.on("active-leaf-change", () => {
      if (frozen) return;
      basename = getCurrFile()?.basename;
    })
  );

  let lines: [string, string][];
  $: {
    const downG = getSubInDirs(closedG, dir);
    const allPaths = dfsAllPaths(downG, basename);
    const index = createIndex(allPaths, false, createIndexIndent);
    info({ allPaths, index });

    lines = indexToLinePairs(index);
  }
</script>

<!-- svelte-ignore a11y-unknown-aria-attribute -->
<span
  class="icon"
  aria-label={frozen ? `Frozen on: ${basename}` : "Unfrozen"}
  aria-label-position="left"
  on:click={() => {
    frozen = !frozen;
    if (!frozen) basename = getCurrFile()?.basename;
  }}
>
  {#if frozen}
    <FaRegSnowflake />
  {:else}
    <FaFire />
  {/if}
</span>

<button
  aria-label="Refresh Stats View (also refreshes Breadcrumbs Index)"
  on:click={async () => {
    await refreshIndex(plugin);
    await view.draw();
  }}
>
  ↻
</button>

<select class="dropdown" bind:value={dir}>
  {#each DIRECTIONS as direction}
    <option value={direction}>{direction}</option>
  {/each}
</select>

<div class="BC-downs">
  {#each lines as line}
    {#if line.length > 1}
      <div>
        <pre>{line[0] + "-"}</pre>
        <span
          class="internal-link"
          on:click={async (e) => await openOrSwitch(line[1], e)}
          on:mouseover={(e) => hoverPreview(e, view, line[1])}
        >
          <!-- svelte-ignore a11y-missing-attribute -->
          <a class="internal-link {isInVault(line[1]) ? '' : 'is-unresolved'}"
            >{dropDendron(line[1], settings)}</a
          >
        </span>
      </div>
    {/if}
  {/each}
</div>

<style>
  button {
    display: inline;
    padding: 1px 6px 2px 6px;
  }

  .BC-downs {
    padding-left: 5px;
  }
  pre {
    display: inline;
  }

  .is-unresolved {
    color: var(--text-muted);
  }

  .icon {
    color: var(--text-normal);
    display: inline-block;
    padding-top: 5px !important;
    width: 20px;
    height: 20px;
  }
</style>
