<script lang="ts">
  import type { App } from "obsidian";
  import type BreadcrumbsSettings from "src/main";
  import type { internalLinkObj } from "src/MatrixView";

  export let settings: BreadcrumbsSettings;
  export let list;
  const realItems: internalLinkObj[] = list.realItems;
  const impliedItems: internalLinkObj[] = list.impliedItems;
  const fieldName: string = list.fieldName;
  const app: App = list.app;

  async function openLink(item: internalLinkObj) {
    await app.workspace.openLinkText(item.to, item.currFile.path);
  }
</script>

<details open>
  <summary>{fieldName}</summary>
  {#if realItems.length}
    {#if settings.showRelationType}
      <h5 class="header">Real</h5>
    {/if}

    <ol class="markdown-preview-view">
      {#each realItems as realItem}
        <li>
          <a
            href="null"
            class={realItem.cls}
            on:click={async () => openLink(realItem)}
          >
            {realItem.to.split("/").last()}
          </a>
        </li>
      {/each}
    </ol>
  {/if}

  {#if impliedItems.length}
    {#if settings.showRelationType}
      <h5 class="header">Implied</h5>
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
  h5.header {
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
