<script lang="ts">
  import { info } from "loglevel";
  import type { MarkdownPostProcessorContext } from "obsidian";
  import { isInVault, openOrSwitch } from "obsidian-community-lib/dist/utils";
  import {
    dfsAllPaths,
    getOppDir,
    getReflexiveClosure,
    getSubInDirs,
  } from "../graphUtils";
  import type { Directions } from "../interfaces";
  import type BCPlugin from "../main";
  import { dropDendron } from "../sharedFunctions";

  export let plugin: BCPlugin;
  export let ctx: MarkdownPostProcessorContext;
  export let el: HTMLElement;
  export let dir: Directions;
  export let fields: string[];
  export let title: string;
  export let depth: string;
  export let flat: string;
  export let content: string;

  const { settings, app, mainG } = plugin;
  const { sourcePath } = ctx;
  const currFile = app.metadataCache.getFirstLinkpathDest(sourcePath, "");
  const { userHiers } = settings;
  const { basename } = currFile;
  const nodes: { [note: string]: HTMLElement } = {};

  async function appendContent(note: string) {
    const node = nodes[note];
    const file = app.metadataCache.getFirstLinkpathDest(note, "");
    const content = await app.vault.cachedRead(file);
    node.createEl("div", {
      text: content,
      cls: "BC-note-content",
      attr: { style: "padding-left: 20px;" },
    });
  }

  let depthAsNum: number = 1000;
  if (depth !== undefined && depth !== "") {
    const num = parseInt(depth);
    if (!isNaN(num)) depthAsNum = num;
  }

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
      return [flat === "true" ? "" : pair[0], pair.slice(1).join("- ")] as [
        string,
        string
      ];
    })
    .filter((pair) => pair[1] !== "");
</script>

{#if title !== "false"}
  <h3>{dir} of {basename}</h3>
{/if}
<div class="BC-tree">
  {#each lines as line}
    {#if line.length > 1 && line[0].length / 2 < depthAsNum}
      {#if content === "true"}
        <div>
          <pre class="indent">{line[0]}</pre>
          <details
            bind:this={nodes[line[1]]}
            on:click={async (e) => {
              // I think `open` only gets toggled after this finishes, so check if `!open`
              if (
                !e.target.open &&
                !nodes[line[1]].querySelector(".BC-note-content")
              ) {
                await appendContent(line[1]);
              }
            }}
          >
            <summary>
              <span
                class="internal-link"
                on:click={async (e) =>
                  await openOrSwitch(plugin.app, line[1], e)}
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
            </summary>
          </details>
        </div>
      {:else}
        <div>
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
    position: top;
  }
  details {
    display: inline-block;
  }

  .is-unresolved {
    color: var(--text-muted);
  }

  button.append-content {
    padding: 1px 5px;
    margin-right: 2px;
  }
</style>
