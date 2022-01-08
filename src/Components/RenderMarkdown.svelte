<script lang="ts">
  import { App, MarkdownRenderer, TFile } from "obsidian";
  import { onMount } from "svelte";

  export let path: string;
  export let app: App;

  async function getContent(note: string) {
    const file = app.metadataCache.getFirstLinkpathDest(note, "");
    return await app.vault.cachedRead(file);
  }

  let el: HTMLElement;
  onMount(async () => {
    MarkdownRenderer.renderMarkdown(await getContent(path), el, path, null);
  });
</script>

<div class="BC-note-content" bind:this={el} />

<style>
  div.BC-note-content {
    padding-left: 20px;
  }
</style>
