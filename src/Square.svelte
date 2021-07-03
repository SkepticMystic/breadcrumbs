<script lang="ts">
  import type { TFile } from "obsidian";
  import { VIEW_TYPE_BREADCRUMBS_MATRIX } from "src/constants";
  import type { BreadcrumbsSettings, internalLinkObj } from "src/interfaces";
  import type MatrixView from "src/MatrixView";
  import { linkClick } from "src/sharedFunctions";

  export let realItems: internalLinkObj[];
  export let impliedItems: internalLinkObj[];
  export let fieldName: string;
  export let currFile: TFile;
  export let settings: BreadcrumbsSettings;
  export let matrixView: MatrixView;

  function hoverPreview(event: MouseEvent, view: MatrixView, source: string) {
    const targetEl = event.target as HTMLElement;

    matrixView.app.workspace.trigger("hover-link", {
      event,
      source,
      hoverParent: view,
      targetEl,
      linktext: targetEl.innerText,
    });
  }
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
          <a
            data-href={realItem.to.split("/").last()}
            href={realItem.to.split("/").last()}
            class={realItem.cls}
            on:click={async () => linkClick(matrixView, realItem, currFile)}
            on:mouseover={(event) =>
              hoverPreview(event, matrixView, VIEW_TYPE_BREADCRUMBS_MATRIX)}
          >
            {realItem.to.split("/").last()}
          </a>
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
          <a
            data-href={impliedItem.to.split("/").last()}
            href={impliedItem.to.split("/").last()}
            class={impliedItem.cls}
            on:click={async () => linkClick(matrixView, impliedItem, currFile)}
            on:mouseover={hoverPreview}
            >{impliedItem.to.split("/").last()}
          </a>
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
