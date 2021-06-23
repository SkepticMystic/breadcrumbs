<script lang="ts">
  import type { App } from "obsidian";

  import type { internalLinkObj } from "src/MatrixView";

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

  {#if realItems.length > 0}
    <h5 class="header">Real</h5>
  {/if}

  {#if realItems.length > 1}
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
  {:else if realItems.length === 1}
    <a
      href="null"
      class={realItems[0].cls}
      on:click={async () => openLink(realItems[0])}
    >
      {realItems[0].to}
    </a>
  {/if}

  {#if impliedItems.length > 0}
    <h5 class="header">Implied</h5>
  {/if}

  {#if impliedItems.length > 1}
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
  {:else if impliedItems.length === 1}
    <a
      href="null"
      class={impliedItems[0].cls}
      on:click={async () => openLink(impliedItems[0])}>{impliedItems[0].to}</a
    >
  {/if}
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
