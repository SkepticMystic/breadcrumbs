<script lang="ts">
  import type { MarkdownPostProcessorContext, TFile } from "obsidian";
  import type BCPlugin from "../main";
  import {
    dfsAllPaths,
    getOppDir,
    getReflexiveClosure,
    getSubInDirs,
  } from "../graphUtils";
  import type { Directions } from "../interfaces";
  import { info } from "loglevel";
  import {
    hoverPreview,
    isInVault,
    openOrSwitch,
  } from "obsidian-community-lib/dist/utils";
  import { dropDendron } from "../sharedFunctions";

  export let plugin: BCPlugin;
  export let ctx: MarkdownPostProcessorContext;
  export let el: HTMLElement;
  export let dir: Directions;
  export let fields: string[];
  export let title: string;

  const { settings, app, mainG } = plugin;
  const { sourcePath } = ctx;
  const currFile = app.metadataCache.getFirstLinkpathDest(sourcePath, "");
  const { userHiers } = settings;
  const { basename } = currFile;
  const oppDir = getOppDir(dir);

  const upnDown = getSubInDirs(mainG, dir, oppDir);
  const closed = getReflexiveClosure(upnDown, userHiers);
  const down = getSubInDirs(closed, dir);

  const allPaths = dfsAllPaths(down, basename);
  const index = plugin.createIndex(allPaths, false);
  info({ allPaths, index });

  const lines = index
    .split("\n")
    .map((line) => {
      const pair = line.split("- ");
      return [pair[0], pair.slice(1).join("- ")] as [string, string];
    })
    .filter((pair) => pair[1] !== "");
</script>

{#if title !== "false"}
  <h3>{dir} of {basename}</h3>
{/if}
<div class="BC-tree">
  {#each lines as line}
    {#if line.length > 1}
      <div style={settings.downViewWrap ? "" : "white-space: nowrap;"}>
        <pre class="indent">{line[0] + "-"}</pre>
        <span
          class="internal-link"
          on:click={async (e) => await openOrSwitch(plugin.app, line[1], e)}
          on:mouseover={(e) => {
            //   hoverPreview needs an itemView so it can access `app`...
            //   hoverPreview(e, el, line[1])
          }}
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
  .BC-tree {
    padding-left: 5px;
  }
  /* .BC-tree > div {
    white-space: nowrap;
  } */
  pre.indent {
    display: inline;
    background-color: transparent;
  }

  .is-unresolved {
    color: var(--text-muted);
  }
</style>
