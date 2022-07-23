<script lang="ts">
  import {
    isInVault,
    openOrSwitch,
    hoverPreview,
  } from "obsidian-community-lib/dist/utils";
  import { meetsConditions } from "../Codeblocks";
  import type { ParsedCodeblock } from "../interfaces";
  import type BCPlugin from "../main";
  import { dropDendron } from "../Utils/generalUtils";
  import RenderMarkdown from "./RenderMarkdown.svelte";

  export let plugin: BCPlugin;
  export let el: HTMLElement;
  export let lines: [string, string][];
  export let froms: string[];
  export let min: number;
  export let max: number;
  export let basename: string;
  export let parsedSource: ParsedCodeblock;

  const { settings } = plugin;
  const { title, content, dir } = parsedSource;

  const activeLeafView = app.workspace.activeLeaf.view;
</script>

{#if title !== false}
  <h3>{dir} of {basename}</h3>
{/if}
<div class="BC-tree">
  {#each lines as [indent, link]}
    {#if meetsConditions(indent, link, froms, min, max)}
      {#if content === "open" || content === "closed"}
        <div>
          <pre class="indent">{indent}</pre>
          <details open={content === "open"}>
            <summary>
              <span
                class="internal-link"
                on:click={async (e) => await openOrSwitch(app, link, e)}
                on:mouseover={(e) => hoverPreview(e, activeLeafView, link)}
              >
                <!-- svelte-ignore a11y-missing-attribute -->
                <a
                  class="internal-link {isInVault(app, link)
                    ? ''
                    : 'is-unresolved'}">{dropDendron(link, settings)}</a
                >
              </span>
            </summary>
            <RenderMarkdown path={link} />
          </details>
        </div>
      {:else}
        <div>
          <pre class="indent">{indent + "-"}</pre>
          <span
            class="internal-link"
            on:click={async (e) => await openOrSwitch(app, link, e)}
            on:mouseover={(e) => hoverPreview(e, activeLeafView, link)}
          >
            <!-- svelte-ignore a11y-missing-attribute -->
            <a
              class="internal-link {isInVault(app, link)
                ? ''
                : 'is-unresolved'}"
            >
              {dropDendron(link, settings)}
            </a>
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
</style>
