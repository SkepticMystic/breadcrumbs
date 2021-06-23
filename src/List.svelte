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

  {#if settings.showRelationType}
    <h5 class="header">Real</h5>
  {/if}

  <ol>
    {#each realItems as realItem}
      <li>
        <a
          href="null"
          class={realItem.cls}
          on:click={async () => openLink(realItem)}
        >
          {realItem.to}
        </a>
      </li>
    {/each}
  </ol>

  {#if settings.showRelationType}
    <h5 class="header">Implied</h5>
  {/if}

  <ol>
    {#each impliedItems as impliedItem}
      <li>
        <a
          href="null"
          class={impliedItem.cls}
          on:click={async () => openLink(impliedItem)}
          >{impliedItem.to}
        </a>
      </li>
    {/each}
  </ol>
</details>

<style>
  summary {
    font-size: larger;
    margin: 3px;
  }
  h5.header {
    margin: 3px;
  }

  ol {
    margin: 3px;
  }
</style>
