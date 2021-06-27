<script lang="ts">
  import type { SquareProps } from "src/interfaces";
  import type BreadcrumbsSettings from "src/main";
  import type MatrixView from "src/MatrixView";
  import List from "./List.svelte";

  export let parents: SquareProps;
  export let siblings: SquareProps;
  export let children: SquareProps;
  export let settings: BreadcrumbsSettings;
  export let matrixView: MatrixView;

  const lists = [parents, siblings, children];
</script>

<div class="breadcrumbs-list">
  {#each lists as list}
    {#if list.realItems.length > 0 || list.impliedItems.length > 0}
      <List {list} {settings} {matrixView} />
    {/if}
  {/each}
</div>

<style>
</style>
