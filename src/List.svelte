<script lang="ts">
  import { VIEW_TYPE_BREADCRUMBS_MATRIX } from "src/constants";

  import type BreadcrumbsSettings from "src/main";
  import type { internalLinkObj, SquareProps } from "src/MatrixView";

  export let settings: BreadcrumbsSettings;
  export let list: SquareProps;
  const { realItems, impliedItems, fieldName, app } = list;
  const currFile = app.workspace.getActiveFile();

  async function openLink(item: internalLinkObj) {
    await app.workspace.openLinkText(item.to, item.currFile.path);
  }

  function hoverPreview(e: MouseEvent) {
    const targetEl = e.target as HTMLElement;

    app.workspace.trigger("hover-link", {
      event: e,
      source: VIEW_TYPE_BREADCRUMBS_MATRIX,
      hoverParent: targetEl.parentElement,
      targetEl,
      linktext: currFile.basename,
      sourcePath: currFile.path,
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
            on:mouseover={(e) => hoverPreview(e)}
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

    <ol class="markdown-preview-view">
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
