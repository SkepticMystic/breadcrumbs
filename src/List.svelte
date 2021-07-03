<script lang="ts">
  import type { App, TFile } from "obsidian";
  import type { BreadcrumbsSettings, SquareProps } from "src/interfaces";
  import type MatrixView from "src/MatrixView";
  import { hoverPreview, openOrSwitch } from "src/sharedFunctions";

  export let app: App;
  export let settings: BreadcrumbsSettings;
  export let matrixView: MatrixView;
  export let currFile: TFile;
  export let list: SquareProps;
  const { realItems, impliedItems, fieldName } = list;
</script>

<details open class="breadcrumbs-details">
  <summary>{fieldName}</summary>
  {#if realItems.length}
    {#if settings.showRelationType}
      <h5 class="breadcrumbs-header">Real</h5>
    {/if}

    <ol class="markdown-preview-view">
      {#each realItems as realItem}
        <li>
          <div
            class={realItem.cls}
            on:click={async (e) => openOrSwitch(app, realItem.to, currFile, e)}
            on:mouseover={(e) => hoverPreview(e, matrixView)}
          >
            {realItem.to.split("/").last()}
          </div>
        </li>
      {/each}
    </ol>
  {/if}

  {#if impliedItems.length}
    {#if settings.showRelationType}
      <h5 class="breadcrumbs-header">Implied</h5>
    {/if}

    <ol class="markdown-preview-view" start={realItems.length + 1}>
      {#each impliedItems as impliedItem}
        <li class="breadcrumbs-implied">
          <div
            class={impliedItem.cls}
            on:click={async (e) =>
              openOrSwitch(app, impliedItem.to, currFile, e)}
            on:mouseover={(e) => hoverPreview(e, matrixView)}
          >
            {impliedItem.to.split("/").last()}
          </div>
        </li>
      {/each}
    </ol>
  {/if}
</details>

<style>
  summary {
    font-size: larger;
    margin: 3px;
    color: var(--text-title-h3);
  }
  h5.breadcrumbs-header {
    margin: 3px;
    color: var(--text-title-h5);
  }

  ol.markdown-preview-view {
    margin: 3px;
    padding-left: 20px;
    padding-top: 5px;
    padding-bottom: 5px;
  }
</style>
