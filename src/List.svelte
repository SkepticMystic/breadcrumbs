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
      <h5 class="breadcrumbs-header">Implied</h5>
    {/if}

    <ol class="markdown-preview-view" start={realItems.length + 1}>
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
