<script lang="ts">
  import type { App, TFile } from "obsidian";
  import { hoverPreview, openOrSwitch } from "obsidian-community-lib";
  import type { BCSettings, SquareProps } from "../interfaces";
  import type MatrixView from "../MatrixView";
  import { dropPathNDendron } from "../sharedFunctions";

  export let filteredSquaresArr: SquareProps[][];
  export let currFile: TFile;
  export let settings: BCSettings;
  export let matrixView: MatrixView;
  export let app: App;
</script>

<div
  class="BC-Matrix  markdown-preview-view {filteredSquaresArr.length
    ? ''
    : 'BC-empty-view'}"
>
  {#each filteredSquaresArr as squares}
    <div>
      {#each squares as square}
        {#if square.realItems.length > 0 || square.impliedItems.length > 0}
          <div class="BC-Matrix-square">
            <div class="BC-Matrix-headers">
              <h4 class="BC-Matrix-header">{square.field}</h4>

              {#if settings.showRelationType}
                <h6 class="BC-Matrix-header">
                  {square.realItems.length ? "Real" : "Implied"}
                </h6>
              {/if}
            </div>
            {#if square.realItems.length}
              <ol>
                {#each square.realItems as realItem}
                  <li>
                    <div
                      class={realItem.cls}
                      on:click={async (e) => openOrSwitch(app, realItem.to, e)}
                      on:mouseover={(event) =>
                        hoverPreview(event, matrixView, realItem.to)}
                    >
                      {realItem.alt ?? dropPathNDendron(realItem.to, settings)}
                    </div>
                  </li>
                {/each}
              </ol>
            {/if}

            {#if square.impliedItems.length}
              <div class="BC-Matrix-headers">
                <h4 class="BC-Matrix-header" />
                {#if square.impliedItems.length}
                  {#if settings.showRelationType && square.realItems.length}
                    <h6 class="BC-Matrix-header">Implied</h6>
                  {/if}
                {/if}
              </div>
              <ol start={square.realItems.length + 1}>
                {#each square.impliedItems as impliedItem}
                  <li class="BC-Implied">
                    <div
                      class={impliedItem.cls}
                      on:click={async (e) =>
                        openOrSwitch(app, impliedItem.to, e)}
                      on:mouseover={(e) =>
                        hoverPreview(e, matrixView, impliedItem.to)}
                      aria-label={impliedItem.parent
                        ? "↑ " + impliedItem.parent
                        : ""}
                      aria-label-position="left"
                    >
                      {impliedItem.alt ??
                        dropPathNDendron(impliedItem.to, settings)}
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

  div.BC-Matrix-headers {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .BC-Matrix-header {
    margin: 2px;
    padding: 0px 10px;
  }

  /* h4.BC-Matrix-header {
    color: var(--text-title-h4);
  }
  h6.BC-Matrix-header {
    color: var(--text-title-h6);
  } */

  ol {
    margin: 3px;
    padding-left: 30px;
  }
</style>
