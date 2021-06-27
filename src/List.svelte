<script lang="ts">
  import { VIEW_TYPE_BREADCRUMBS_MATRIX } from "src/constants";
  import type {
    BreadcrumbsSettings,
    internalLinkObj,
    SquareProps,
  } from "src/interfaces";
  import type MatrixView from "src/MatrixView";

  export let settings: BreadcrumbsSettings;
  export let matrixView: MatrixView;
  export let list: SquareProps;
  const { realItems, impliedItems, fieldName, app } = list;
  const currFile = app.workspace.getActiveFile();

  async function openLink(item: internalLinkObj) {
    await app.workspace.openLinkText(item.to, item.currFile.path);
  }

  function hoverPreview(e) {
    // const event = e.native
    const targetEl = e.target as HTMLElement;
    const hoverParent = matrixView.containerEl;
    console.log("hovering");
    console.log(hoverParent);
    app.workspace.trigger("hover-link", {
      event: e,
      source: VIEW_TYPE_BREADCRUMBS_MATRIX,
      hoverParent,
      targetEl,
      linktext: currFile.path,
    });
  }
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
          <a
            href="null"
            class={realItem.cls}
            on:click={async () => openLink(realItem)}
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
      <h5 class="breadcrumbs-header">Implied</h5>
    {/if}

    <ol class="markdown-preview-view" start={realItems.length + 1}>
      {#each impliedItems as impliedItem}
        <li class="breadcrumbs-implied">
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
