<script lang="ts">
  import type { App } from "obsidian";
  import { VIEW_TYPE_BREADCRUMBS_MATRIX } from "src/constants";
  import type { BreadcrumbsSettings, internalLinkObj } from "src/interfaces";
  import type MatrixView from "src/MatrixView";

  export let realItems: internalLinkObj[];
  export let impliedItems: internalLinkObj[];
  export let fieldName: string;
  export let app: App;
  export let settings: BreadcrumbsSettings;
  export let matrixView: MatrixView;

  // async function openLink(item: internalLinkObj) {
  //   await app.workspace.openLinkText(item.to, item.currFile.path);
  // }

  async function linkClick(item: internalLinkObj) {
    const openLeaves = [];
    // For all open leaves, if the leave's basename is equal to the link destination, rather activate that leaf instead of opening it in two panes
    app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.view?.file?.basename === item.to) {
        openLeaves.push(leaf);
      }
    });

    if (openLeaves.length) {
      app.workspace.setActiveLeaf(openLeaves[0]);
    } else {
      await app.workspace.openLinkText(item.to, item.currFile.path);
    }
  }

  function hoverPreview(e) {
    const targetEl = e.target as HTMLElement;
    const hoverParent = matrixView;

    app.workspace.trigger("hover-link", {
      event: e,
      source: VIEW_TYPE_BREADCRUMBS_MATRIX,
      hoverParent,
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
            on:click={async () => linkClick(realItem)}
            on:mouseover={hoverPreview}
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
            on:click={async () => linkClick(impliedItem)}
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
