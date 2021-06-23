<script lang="ts">
  import Square from "./Square.svelte";
  import Filler from "./Filler.svelte";
  import type SquareProps from "./MatrixView";

  export let parents: SquareProps;
  export let top: SquareProps;
  export let current: SquareProps;
  export let siblings: SquareProps;
  export let children: SquareProps;
</script>

<div class="breadcrumbs-matrix  markdown-preview-view">
  <div class="grid-container">
    <Filler />
    <Square {...parents} />
    <Filler />
    <Square {...top} />
    <Square {...current} />
    <Square {...siblings} />
    <Filler />
    <Square {...children} />
    <Filler />
  </div>
</div>

<style>
  div.breadcrumbs-matrix {
    text-align: center;
    padding: 1em;
    /* max-width: 240px; */
    margin: 0 auto;
  }

  div.grid-container {
    display: grid;
    grid-template-rows: repeat(3, 1fr);
    grid-template-columns: repeat(3, 1fr);
    align-items: stretch;
  }
</style>
