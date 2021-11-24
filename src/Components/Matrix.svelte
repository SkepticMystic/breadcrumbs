<script lang="ts">
  import type { App, TFile } from "obsidian";
  import { hoverPreview, openOrSwitch } from "obsidian-community-lib";
  import type { BCSettings, SquareProps } from "../interfaces";
  import type MatrixView from "../MatrixView";

  export let filteredSquaresArr: SquareProps[][];
  export let currFile: TFile;
  export let settings: BCSettings;
  export let matrixView: MatrixView;
  export let app: App;
</script>

<div class="BC-Matrix  markdown-preview-view">
  {#each filteredSquaresArr as squares}
    <div>
      {#each squares as square}
        {#if square.realItems.length > 0 || square.impliedItems.length > 0}
          <div class="BC-Matrix-square">
            <h3 class="BC-Matrix-header">{square.field}</h3>

            {#if square.realItems.length}
              {#if settings.showRelationType}
                <h5 class="BC-Matrix-header">Real</h5>
              {/if}
              <ol>
                {#each square.realItems as realItem}
                  <li>
                    <div
                      class={realItem.cls}
                      on:click={async (e) => openOrSwitch(app, realItem.to, e)}
                      on:mouseover={(event) =>
                        hoverPreview(event, matrixView, realItem.to)}
                    >
                      {realItem.alt ?? realItem.to.split("/").last()}
                    </div>
                  </li>
                {/each}
              </ol>
            {/if}

            {#if square.impliedItems.length}
              {#if settings.showRelationType}
                <h5 class="BC-Matrix-header">Implied</h5>
              {/if}
              <ol start={square.realItems.length + 1}>
                {#each square.impliedItems as impliedItem}
                  <li class="BC-Implied">
                    <div
                      class={impliedItem.cls}
                      on:click={async (e) =>
                        openOrSwitch(app, impliedItem.to, e)}
                      on:mouseover={(e) =>
                        hoverPreview(e, matrixView, impliedItem.to)}
                    >
                      {impliedItem.alt ?? impliedItem.to.split("/").last()}
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
  div.BC-Matrix {
    padding: 5px;
  }
  div.BC-Matrix > div {
    border: 3px solid var(--background-modifier-border);
    border-radius: 3px;
    text-align: center;
    /* padding: 5px; */
    /* padding: 1em; */
    /* max-width: 240px; */
    margin: 3px;
    position: relative;
    height: fit-content;
  }

  div.BC-Matrix-square {
    border: 1px solid var(--background-modifier-border);
    /* border-radius: 3px; */
  }

  .BC-Matrix-header {
    margin: 2px;
  }

  h3.BC-Matrix-header {
    color: var(--text-title-h3);
  }
  h5.BC-Matrix-header {
    color: var(--text-title-h5);
  }

  ol {
    margin: 3px;
    padding-left: 20px;
  }
</style>
