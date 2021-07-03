<script lang="ts">
  import type BreadcrumbsSettings from "src/main";
  import type MatrixView from "src/MatrixView";
  import Square from "./Square.svelte";
  import type { SquareProps } from "src/interfaces";
  import type { TFile } from "obsidian";

  export let parents: SquareProps;
  export let siblings: SquareProps;
  export let children: SquareProps;
  export let currFile: TFile;
  export let settings: BreadcrumbsSettings;
  export let matrixView: MatrixView;

  const list = [parents, siblings, children];
</script>

<div class="breadcrumbs-matrix  markdown-preview-view">
  {#each list as item}
    {#if item.realItems.length > 0 || item.impliedItems.length > 0}
      <Square {...item} {currFile} {settings} {matrixView} />
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
