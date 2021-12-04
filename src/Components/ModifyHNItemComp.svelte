<script lang="ts">
  import { error } from "console";

  import { Notice, TFile } from "obsidian";
  import { onMount } from "svelte";
  import { ARROW_DIRECTIONS } from "../constants";
  import type { BCSettings } from "../interfaces";
  import type { ModifyHierItemModal } from "../ModifyHierItemModal";
  import { dropWikilinks, makeWiki } from "../sharedFunctions";

  export let modal: ModifyHierItemModal;
  export let settings: BCSettings;
  export let hnItem: HNItem;
  export let file: TFile;
  export let rel: "up" | "same" | "down";

  interface HNItem {
    depth: number;
    line: string;
    lineNo: number;
  }
  let inputEl: HTMLInputElement;

  let newItem = "";

  const buildNewItem = (
    newItem: string,
    depth = hnItem.depth,
    preview = false
  ) =>
    `${" ".repeat(Math.round(depth / (preview ? 2 : 1)))}- ${
      preview ? newItem || "<Empty>" : makeWiki(newItem)
    }`;

  onMount(() => inputEl.focus());
</script>

<h5>Add an {ARROW_DIRECTIONS[rel]} to {dropWikilinks(hnItem.line)}</h5>
<div>
  {#if rel === "up"}
    {#if hnItem.depth === 0}
      <div>Can't add parent to top level item, choose another direction</div>
    {:else}
      <div>
        <pre>
          {buildNewItem(newItem, hnItem.depth - 4, true)}
        </pre>
      </div>
    {/if}
  {/if}
  <div>
    <pre>
        <strong>{buildNewItem(dropWikilinks(hnItem.line), hnItem.depth, true)}</strong>
    </pre>
  </div>
  {#if rel === "same"}
    <div>
      <pre>
        {buildNewItem(newItem, hnItem.depth, true)}
    </pre>
    </div>
  {:else if rel === "down"}
    <div>
      <pre>
        {buildNewItem(newItem, hnItem.depth + 4, true)}
    </pre>
    </div>
  {/if}

  <!-- svelte-ignore a11y-no-onchange -->
  <select class="dropdown" width="1" bind:value={rel}>
    <option value="up">up</option>
    <option value="same">same</option>
    <option value="down">down</option>
  </select>

  <input
    type="text"
    placeholder="New item"
    bind:this={inputEl}
    bind:value={newItem}
  />

  <button
    on:click={async (e) => {
      if (rel === "up" && hnItem.depth === 0) {
        new Notice(
          "Can't add parent to top level item, choose another direction"
        );
        return;
      } else {
        try {
          const content = await modal.app.vault.read(file);
          const lines = content.split("\n");
          const lineNo = rel === "up" ? hnItem.lineNo : hnItem.lineNo + 1;

          const depth =
            rel === "up"
              ? hnItem.depth - 4
              : rel === "down"
              ? hnItem.depth + 4
              : hnItem.depth;

          lines.splice(lineNo, 0, buildNewItem(newItem, depth));
          await modal.app.vault.modify(file, lines.join("\n"));
          modal.close();
        } catch (err) {
          error(err);
          new Notice("An error occured, please check the console");
        }
      }
    }}>Add</button
  >
</div>

<style>
  pre {
    display: inline;
  }
</style>
