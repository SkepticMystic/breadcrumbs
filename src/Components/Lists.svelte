<script lang="ts">
  import type { App, TFile } from "obsidian";
  import { openOrSwitch } from "src/sharedFunctions";
  import { hoverPreview } from "obsidian-community-lib";
  import type { SquareProps } from "src/interfaces";
  import type BreadcrumbsSettings from "src/main";
  import type MatrixView from "src/MatrixView";

  export let filteredSquaresArr: SquareProps[][];
  export let currFile: TFile;
  export let settings: BreadcrumbsSettings;
  export let matrixView: MatrixView;
  export let app: App;
</script>

<div class="breadcrumbs-list">
  {#each filteredSquaresArr as squares}
    <details open>
      <summary class="hier-summary"
        >{squares.map((square) => square.fieldName).join(", ")}</summary
      >

      {#each squares as square}
        {#if square.realItems.length > 0 || square.impliedItems.length > 0}
          <details open class="breadcrumbs-details">
            <summary>{square.fieldName}</summary>
            {#if square.realItems.length}
              {#if settings.showRelationType}
                <h5 class="breadcrumbs-header">Real</h5>
              {/if}

              <ol class="markdown-preview-view">
                {#each square.realItems as realItem}
                  <li>
                    <div
                      class={realItem.cls}
                      on:click={async (e) =>
                        await openOrSwitch(app, realItem.to, currFile, e)}
                      on:mouseover={(e) =>
                        hoverPreview(e, matrixView, realItem.to)}
                    >
                      {realItem.alt
                        ? realItem.alt
                        : realItem.to.split("/").last()}
                    </div>
                  </li>
                {/each}
              </ol>
            {/if}

            {#if square.impliedItems.length}
              {#if settings.showRelationType}
                <h5 class="breadcrumbs-header">Implied</h5>
              {/if}

              <ol
                class="markdown-preview-view"
                start={square.realItems.length + 1}
              >
                {#each square.impliedItems as impliedItem}
                  <li class="breadcrumbs-implied">
                    <div
                      class={impliedItem.cls}
                      on:click={async (e) =>
                        await openOrSwitch(app, impliedItem.to, currFile, e)}
                      on:mouseover={(e) =>
                        hoverPreview(e, matrixView, impliedItem.to)}
                    >
                      {impliedItem.alt
                        ? impliedItem.alt
                        : impliedItem.to.split("/").last()}
                    </div>
                  </li>
                {/each}
              </ol>
            {/if}
          </details>
        {/if}
      {/each}
    </details>
  {/each}
</div>

<style>
  summary.hier-summary {
    color: var(--text-title-h2);
    font-size: larger;
  }
  summary {
    /* margin: 3px; */
    color: var(--text-title-h3);
  }
  h5.breadcrumbs-header {
    /* margin: 3px; */
    color: var(--text-title-h5);
  }

  ol.markdown-preview-view {
    /* margin: 3px; */
    /* padding-left: 20px; */
    padding-top: 3px;
    padding-bottom: 5px;
  }
</style>
