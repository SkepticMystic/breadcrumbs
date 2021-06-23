<script lang="ts">
import type { App } from "obsidian";

  import type internalLinkObj from "./MatrixView";

  export let realItems: internalLinkObj[];
  export let impliedItems: internalLinkObj[];
  export let fieldName: string;
  export let app: App

  async function openLink(item: internalLinkObj) {
    await app.workspace.openLinkText(item.to, item.currFile.path)
  }
</script>

<div class="square grid-item">
  <h3 class="header">{fieldName}</h3>

  {#if realItems.length}
    <h5 class="header">Real</h5>
    {#if realItems.length > 1}
      <ol>
        {#each realItems as item}
          <li>
            <a href=null class={item.cls} on:click={async () => openLink(item)}>{item.to}</a>
          </li>
        {/each}
      </ol>
    {:else}
    <a href=null on:click={async () => openLink(realItems[0].to)}>{realItems[0].to}</a>
    {/if}
  {/if}

  {#if impliedItems.length}
    <h5 class="header">Implied</h5>
    {#if impliedItems.length > 1}
      <ol>
        {#each impliedItems as item}
          <li>
            <a href=null on:click={async () => openLink(item)}>{item.to}</a>
          </li>
        {/each}
      </ol>
    {:else}
    <a href=null on:click={async () => openLink(impliedItems[0].to)}>{impliedItems[0].to}</a>
    {/if}
  {/if}
</div>

<style>
  div.square {
    /* display: flex;
    flex-direction: column; */
    border: 2px solid white;
    border-radius: 5px;
  }
</style>
