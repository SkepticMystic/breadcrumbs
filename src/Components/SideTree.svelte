<script lang="ts">
  import { info } from "loglevel";
  import {
    hoverPreview,
    isInVault,
    openOrSwitch,
  } from "obsidian-community-lib";
  import {
    dfsAllPaths,
    getOppDir,
    getReflexiveClosure,
    getSubInDirs,
  } from "../graphUtils";
  import FaFire from "svelte-icons/fa/FaFire.svelte";
  import FaRegSnowflake from "svelte-icons/fa/FaRegSnowflake.svelte";
  import type { Directions } from "../interfaces";
  import type BCPlugin from "../main";
  import { dropDendron } from "../sharedFunctions";
  import type TreeView from "../TreeView";
  import { DIRECTIONS } from "../constants";

  export let plugin: BCPlugin;
  export let view: TreeView;

  const { settings } = plugin;
  const { userHiers } = settings;

  let dir: Directions = "down";
  $: oppDir = getOppDir(dir);
  let frozen = false;
  let { basename } = plugin.app.workspace.getActiveFile();

  plugin.app.workspace.on("active-leaf-change", () => {
    if (frozen) return;
    basename = plugin.app.workspace.getActiveFile().basename;
  });

  let lines: [string, string][];
  $: {
    const { mainG } = plugin;
    const upnDown = getSubInDirs(mainG, dir, oppDir);
    const closed = getReflexiveClosure(upnDown, userHiers);
    const down = getSubInDirs(closed, dir);

    const allPaths = dfsAllPaths(down, basename);
    const index = plugin.createIndex(allPaths, false);
    info({ allPaths, index });

    lines = index
      .split("\n")
      .map((line) => {
        const pair = line.split("- ");
        return [pair[0], pair.slice(1).join("- ")] as [string, string];
      })
      .filter((pair) => pair[1] !== "");
  }
</script>

<!-- svelte-ignore a11y-unknown-aria-attribute -->
<span
  class="icon"
  aria-label={frozen ? `Frozen on: ${basename}` : "Unfrozen"}
  aria-label-position="left"
  on:click={() => {
    frozen = !frozen;
    if (!frozen) basename = plugin.app.workspace.getActiveFile().basename;
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
    await plugin.refreshIndex();
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
      <div style={settings.downViewWrap ? "" : "white-space: nowrap;"}>
        <pre>{line[0] + "-"}</pre>
        <span
          class="internal-link"
          on:click={async (e) => await openOrSwitch(plugin.app, line[1], e)}
          on:mouseover={(e) => hoverPreview(e, view, line[1])}
        >
          <!-- svelte-ignore a11y-missing-attribute -->
          <a
            class="internal-link {isInVault(plugin.app, line[1])
              ? ''
              : 'is-unresolved'}">{dropDendron(line[1], settings)}</a
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
  /* .BC-downs > div {
    white-space: nowrap;
  } */
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
