<script lang="ts">
  import type { App, TFile } from "obsidian";
  import type { BreadcrumbsSettings, internalLinkObj } from "src/interfaces";
  import type MatrixView from "src/MatrixView";
  import { hoverPreview, openOrSwitch } from "src/sharedFunctions";

  export let realItems: internalLinkObj[];
  export let impliedItems: internalLinkObj[];
  export let fieldName: string;
  export let currFile: TFile;
  export let settings: BreadcrumbsSettings;
  export let matrixView: MatrixView;
  export let app: App;
</script>

<div class="breadcrumbs-matrix-square">
  <h3 class="breadcrumbs-matrix-header">{fieldName}</h3>

  {#if realItems.length}
    {#if settings.showRelationType}
      <h5 class="breadcrumbs-matrix-header">Real</h5>
    {/if}
    <ol>
      {#each realItems as realItem}
        <li>
          <div
            class={realItem.cls}
            on:click={async (e) => openOrSwitch(app, realItem.to, currFile, e)}
            on:mouseover={(event) => hoverPreview(event, matrixView)}
          >
            {realItem.to.split("/").last()}
          </div>
        </li>
      {/each}
    </ol>
  {/if}

  {#if impliedItems.length}
    {#if settings.showRelationType}
      <h5 class="breadcrumbs-matrix-header">Implied</h5>
    {/if}
    <ol start={realItems.length + 1}>
      {#each impliedItems as impliedItem}
        <li class="breadcrumbs-implied">
          <div
            class={impliedItem.cls}
            on:click={async (e) =>
              openOrSwitch(app, impliedItem.to, currFile, e)}
            on:mouseover={(event) => hoverPreview(event, matrixView)}
          >
            {impliedItem.to.split("/").last()}
          </div>
        </li>
      {/each}
    </ol>
  {/if}
</div>

<style>
  div.breadcrumbs-matrix-square {
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
