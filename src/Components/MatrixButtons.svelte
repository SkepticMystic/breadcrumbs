<script lang="ts">
  import { refreshIndex } from "../refreshIndex";
  import type MatrixView from "../Views/MatrixView";

  export let matrixView: MatrixView;

  const { plugin } = matrixView;
  const { alphaSortAsc, enableAlphaSort } = plugin.settings;
</script>

<button
  class="BC-refresh-button"
  aria-label="Refresh Index"
  on:click={async () => await refreshIndex(plugin)}
>
  ↻
</button>

{#if enableAlphaSort}
  <button
    class="BC-sort-button"
    aria-label="Alphabetical Sorting Order"
    on:click={async () => {
      plugin.settings.alphaSortAsc = !alphaSortAsc;
      await plugin.saveSettings();
      await matrixView.draw();
    }}
  >
    {alphaSortAsc ? "↗" : "↘"}
  </button>
{/if}

<style>
  button {
    padding: 1px 6px 2px 6px;
    margin-right: 6px;
  }
</style>
