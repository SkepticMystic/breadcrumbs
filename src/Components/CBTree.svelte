<script lang="ts">
  import { isInVault, openOrSwitch } from "obsidian-community-lib/dist/utils";
  import type { Directions } from "../interfaces";
  import type BCPlugin from "../main";
  import { dropDendron, dropFolder } from "../sharedFunctions";
  import RenderMarkdown from "./RenderMarkdown.svelte";

  export let plugin: BCPlugin;
  export let el: HTMLElement;
  export let dir: Directions;
  export let fields: string[];
  export let title: string;
  export let flat: string;
  export let content: string;
  export let index: any;
  export let froms: string[];
  export let min: number;
  export let max: number;
  export let basename: string;

  const {settings, app} = plugin;

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

  const indentToDepth = (indent: string) => indent.length / 2 + 1;

  const meetsConditions = (indent: string, node: string) => {
    const depth = indentToDepth(indent);
    return (
      depth >= min &&
      depth <= max &&
      (froms === undefined || froms.includes(node))
    );
  };
</script>

{#if title !== "false"}
  <h3>{dir} of {basename}</h3>
{/if}
<div class="BC-tree">
  {#each lines as [indent, link]}
    {#if meetsConditions(indent, link)}
      {#if content === "open" || content === "closed"}
        <div>
          <pre class="indent">{indent}</pre>
          <details open={content === "open"}>
            <summary>
              <span
                class="internal-link"
                on:click={async (e) => await openOrSwitch(plugin.app, link, e)}
                on:mouseover={(e) => {
                  //   hoverPreview needs an itemView so it can access `app`...
                  //   hoverPreview(e, el, link)
                }}
              >
                <!-- svelte-ignore a11y-missing-attribute -->
                <a
                  class="internal-link {isInVault(plugin.app, link)
                    ? ''
                    : 'is-unresolved'}">{dropDendron(link, settings)}</a
                >
              </span>
            </summary>
            <RenderMarkdown {app} path={link} />
          </details>
        </div>
      {:else}
        <div>
          <pre class="indent">{indent + "-"}</pre>
          <span
            class="internal-link"
            on:click={async (e) => await openOrSwitch(plugin.app, link, e)}
            on:mouseover={(e) => {
              //   hoverPreview needs an itemView so it can access `app`...
              //   hoverPreview(e, el, link)
            }}
          >
            <!-- svelte-ignore a11y-missing-attribute -->
            <a
              class="internal-link {isInVault(plugin.app, link)
                ? ''
                : 'is-unresolved'}">{dropDendron(link, settings)}</a
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
