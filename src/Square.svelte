<script lang="ts">
  import type { App } from "obsidian";
  import type BreadcrumbsSettings from "src/main";
  import type { internalLinkObj } from "src/MatrixView";

  export let realItems: internalLinkObj[];
  export let impliedItems: internalLinkObj[];
  export let fieldName: string;
  export let app: App;
  export let settings: BreadcrumbsSettings;

  async function openLink(item: internalLinkObj) {
    await app.workspace.openLinkText(item.to, item.currFile.path);
  }
</script>

<div class="square">
  <h3 class="breadcrumbs-matrix-header">{fieldName}</h3>

  {#if realItems.length}
    {#if settings.showRelationType}
      <h5 class="breadcrumbs-matrix-header">Real</h5>
    {/if}
    <ol>
      {#each realItems as realItem}
        <li>
          <a
            href="null"
            class={realItem.cls}
            on:click={async () => openLink(realItem)}
            >{realItem.to.split("/").last()}
          </a>
        </li>
      {/each}
    </ol>
  {/if}

  {#if impliedItems.length}
    {#if settings.showRelationType}
      <h5 class="breadcrumbs-matrix-header">Implied</h5>
    {/if}
    <ol>
      {#each impliedItems as impliedItem}
        <li>
          <a
            href="null"
            class={impliedItem.cls}
            on:click={async () => openLink(impliedItem)}
            >{impliedItem.to.split("/").last()}
          </a>
        </li>
      {/each}
    </ol>
  {/if}
</div>

<style>
  div.square {
    /* display: flex;
    flex-direction: column; */
    border: 2px solid var(--background-modifier-border);
    border-radius: 5px;
    padding: 5px;
    height: fit-content;
    position: relative;
  }

  .breadcrumbs-matrix-header {
    margin: 2px;
  }

  h3.breadcrumbs-matrix-header {
    color: var(--text-title-h3);
  }
  h5.breadcrumbs-matrix-header {
    color: var(--text-title-h5);
  }

  ol {
    margin: 3px;
    padding-left: 20px;
  }
</style>
