<script lang="ts">
  import type BreadcrumbsSettings from "src/main";
  import type SquareProps from "./MatrixView";
  import Square from "./Square.svelte";

  export let parents: SquareProps;
  // export let top: SquareProps;
  // export let current: SquareProps;
  export let siblings: SquareProps;
  export let children: SquareProps;
  export let settings: BreadcrumbsSettings;

  const list = [parents, siblings, children];
</script>

<div class="breadcrumbs-matrix  markdown-preview-view">
  {#each list as item}
    {#if item.realItems.length > 0 || item.impliedItems.length > 0}
      <Square {...item} {settings} />
    {/if}
  {/each}
</div>

<style>
  div.breadcrumbs-matrix {
    text-align: center;
    padding: 1em;
    /* max-width: 240px; */
    margin: 0 auto;
  }
</style>
