<script lang="ts">
  import type { TFile } from "obsidian";
  import type { SquareProps } from "../interfaces";
  import type MatrixView from "../Views/MatrixView";
  import List from "./Lists.svelte";
  import Matrix from "./Matrix.svelte";
  import MatrixButtons from "./MatrixButtons.svelte";

  export let hierSquares: SquareProps[][];
  export let matrixView: MatrixView;
  export let currFile: TFile;

  const { plugin } = matrixView;
  const { settings } = plugin;
  const { defaultView } = settings;

  let matrixQ = defaultView;

  const props = { hierSquares, currFile, matrixView };
</script>

<div class="BC-matrix-buttons">
  <MatrixButtons bind:matrixQ {matrixView} />
</div>

{#if matrixQ}
  <Matrix {...props} />
{:else}
  <List {...props} />
{/if}
