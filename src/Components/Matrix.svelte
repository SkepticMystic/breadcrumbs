<script lang="ts">
  import type { TFile } from "obsidian";
  import { hoverPreview, openOrSwitch } from "obsidian-community-lib";
  import MatrixButtons from "./MatrixButtons.svelte";
  import type { SquareProps } from "../interfaces";
  import { dropPathNDendron } from "../Utils/generalUtils";
  import type MatrixView from "../Views/MatrixView";

  export let hierSquares: SquareProps[][];
  export let currFile: TFile;
  export let matrixView: MatrixView;

  const { plugin } = matrixView;
  const { settings } = plugin;

  const {
    showImpliedRelations,
    rlLeaf,
    treatCurrNodeAsImpliedSibling,
    showRelationType,
  } = settings;
</script>

<div class="BC-matrix-buttons">
  <MatrixButtons {matrixView} />
</div>

<div
  class="BC-Matrix  markdown-preview-view {hierSquares.length
    ? ''
    : 'BC-empty-view'}"
>
  {#each hierSquares as squares}
    <div class="BC-matrix-hier">
      {#each squares as { field, impliedItems, realItems }}
        {#if realItems.length || (showImpliedRelations && impliedItems.length)}
          <div class="BC-Matrix-square">
            <div class="BC-Matrix-headers">
              <h4 class="BC-Matrix-header">{field}</h4>

              {#if showRelationType}
                <h6 class="BC-Matrix-header">
                  {realItems.length ? "Real" : "Implied"}
                </h6>
              {/if}
            </div>
            {#if realItems.length}
              <ol>
                {#each realItems as { alt, cls, implied, to }}
                  <li>
                    <div
                      class="{cls} {implied ?? ''}"
                      on:click={async (e) => await openOrSwitch(to, e)}
                      on:mouseover={(event) =>
                        hoverPreview(event, matrixView, to)}
                      aria-label={alt ? to : ""}
                      aria-label-position={rlLeaf ? "left" : "right"}
                    >
                      {alt ?? dropPathNDendron(to, settings)}
                    </div>
                  </li>
                {/each}
              </ol>
            {/if}

            {#if showImpliedRelations && impliedItems.length}
              <div class="BC-Matrix-headers">
                <h4 class="BC-Matrix-header">{" "}</h4>
                {#if impliedItems.length}
                  {#if showRelationType && realItems.length}
                    <h6 class="BC-Matrix-header">Implied</h6>
                  {/if}
                {/if}
              </div>
              <ol start={realItems.length + 1}>
                {#each impliedItems as { alt, cls, implied, to, parent }}
                  <li
                    class="BC-Implied {treatCurrNodeAsImpliedSibling &&
                    to === currFile.basename
                      ? 'BC-active-note'
                      : ''}"
                  >
                    <div
                      class="{cls} {implied ?? ''}"
                      on:click={async (e) => await openOrSwitch(to, e)}
                      on:mouseover={(e) => hoverPreview(e, matrixView, to)}
                      aria-label={(alt ? `${to}\n` : "") +
                        (parent ? "↑ " + parent : "")}
                      aria-label-position={rlLeaf ? "left" : "right"}
                    >
                      {alt ?? dropPathNDendron(to, settings)}
                    </div>
                  </li>
                {/each}
              </ol>
            {/if}
          </div>
        {/if}
      {/each}
    </div>
  {/each}
</div>

<style>
  .BC-Matrix {
    padding: 5px;
    font-variant-numeric: tabular-nums;
    line-height: 1.5;
  }
  .BC-Matrix > div {
    border: 3px solid var(--background-modifier-border);
    border-radius: 3px;
    /* text-align: center; */
    margin: 3px;
    position: relative;
    height: fit-content;
  }

  /* .BC-matrix div {
    text-align: left;
  } */

  .BC-Matrix-square {
    border: 1px solid var(--background-modifier-border);
  }

  .BC-Matrix-headers {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .BC-Matrix-header {
    margin: 2px;
    padding: 0px 10px;
  }
  h4.BC-Matrix-header:first-letter {
    text-transform: capitalize;
  }

  ol {
    margin: 3px;
    padding-left: 30px;
  }

  .BC-Matrix li {
    margin: 0.1em;
  }
</style>
