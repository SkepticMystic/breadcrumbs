<script lang="ts">
  import type { App, TFile } from "obsidian";
  import type { SquareProps } from "src/interfaces";
  import type BreadcrumbsSettings from "src/main";
  import type MatrixView from "src/MatrixView";
  import { hoverPreview, openOrSwitch } from "src/sharedFunctions";

  export let sortedSquaresArr: SquareProps[][];
  export let currFile: TFile;
  export let settings: BreadcrumbsSettings;
  export let matrixView: MatrixView;
  export let app: App;
</script>

<div class="breadcrumbs-matrix  markdown-preview-view">
  {#each sortedSquaresArr as squares}
    <div>
      {#each squares as square}
        {#if square.realItems.length > 0 || square.impliedItems.length > 0}
          <div class="breadcrumbs-matrix-square">
            <h3 class="breadcrumbs-matrix-header">{square.fieldName}</h3>

            {#if square.realItems.length}
              {#if settings.showRelationType}
                <h5 class="breadcrumbs-matrix-header">Real</h5>
              {/if}
              <ol>
                {#each square.realItems as realItem}
                  <li>
                    <div
                      class={realItem.cls}
                      on:click={async (e) =>
                        openOrSwitch(app, realItem.to, currFile, e)}
                      on:mouseover={(event) => hoverPreview(event, matrixView)}
                    >
                      {realItem.to.split("/").last()}
                    </div>
                  </li>
                {/each}
              </ol>
            {/if}

            {#if square.impliedItems.length}
              {#if settings.showRelationType}
                <h5 class="breadcrumbs-matrix-header">Implied</h5>
              {/if}
              <ol start={square.realItems.length + 1}>
                {#each square.impliedItems as impliedItem}
                  <li class="breadcrumbs-implied">
                    <div
                      class={impliedItem.cls}
                      on:click={async (e) =>
                        openOrSwitch(app, impliedItem.to, currFile, e)}
                      on:mouseover={(event) => hoverPreview(event, matrixView)}
                    >
                      {impliedItem.to.split("/").last()}
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
  div.breadcrumbs-matrix {
    padding: 5px;
  }
  div.breadcrumbs-matrix > div {
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

  div.breadcrumbs-matrix-square {
    border: 1px solid var(--background-modifier-border);
    /* border-radius: 3px; */
  }

  .breadcrumbs-matrix-header {
    margin: 2px;
  }

  h3.breadcrumbs-matrix-header {
    color: var(--text-title-h3);
  }
  h5.breadcrumbs-matrix-header {
    color: var(--text-title-h5);
  }

  ol {
    margin: 3px;
    padding-left: 20px;
  }
</style>
