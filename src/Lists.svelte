<script lang="ts">
  import type BreadcrumbsSettings from "src/main";
  import List from "./List.svelte";
  import type SquareProps from "./MatrixView";

  export let parents: SquareProps;
  // export let top: SquareProps;
  export let siblings: SquareProps;
  export let children: SquareProps;
  export let settings: BreadcrumbsSettings;

  const lists = [parents, siblings, children];
  const currFile = parents.app.workspace.getActiveFile().basename;
</script>

<h2 class="header">{currFile}</h2>
{#each lists as list}
  {#if list.realItems.length > 0 || list.impliedItems.length > 0}
    <List {list} {settings} />
  {/if}
{/each}

<style>
  h2.header {
    margin: 3px;
  }
</style>
