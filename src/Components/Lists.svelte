<script lang="ts">
  import type { App, TFile } from "obsidian";
  import { hoverPreview, openOrSwitch } from "obsidian-community-lib";
  import type { BCSettings, SquareProps } from "../interfaces";
  import { dropPathNDendron } from "../Utils/generalUtils";
  import type MatrixView from "../Views/MatrixView";

  export let filteredSquaresArr: SquareProps[][];
  export let currFile: TFile;
  export let settings: BCSettings;
  export let matrixView: MatrixView;
  export let app: App;

  const {
    showImpliedRelations,
    rlLeaf,
    treatCurrNodeAsImpliedSibling,
    showRelationType,
  } = settings;
</script>

<div
  class="BC-list markdown-preview-view {filteredSquaresArr.length
    ? ''
    : 'BC-empty-view'}"
>
  {#each filteredSquaresArr as squares}
    <details open>
      <summary class="hier-summary"
        >{squares.map((square) => square.field).join(", ")}</summary
      >

      {#each squares as square}
        {#if square.realItems.length || (showImpliedRelations && square.impliedItems.length)}
          <details open class="BC-details">
            <summary>{square.field}</summary>
            {#if square.realItems.length}
              {#if showRelationType}
                <h5 class="BC-header">Real</h5>
              {/if}

              <ol>
                {#each square.realItems as realItem}
                  <li>
                    <div
                      class="{realItem.cls} {realItem.implied ?? ''}"
                      on:click={async (e) => openOrSwitch(app, realItem.to, e)}
                      on:mouseover={(e) =>
                        hoverPreview(e, matrixView, realItem.to)}
                    >
                      {realItem.alt ?? dropPathNDendron(realItem.to, settings)}
                    </div>
                  </li>
                {/each}
              </ol>
            {/if}

            {#if showImpliedRelations && square.impliedItems.length}
              {#if showRelationType}
                <h5 class="BC-header">Implied</h5>
              {/if}

              <ol start={square.realItems.length + 1}>
                {#each square.impliedItems as impliedItem}
                  <li
                    class="BC-Implied {treatCurrNodeAsImpliedSibling &&
                    impliedItem.to === currFile.basename
                      ? 'BC-active-note'
                      : ''}"
                  >
                    <div
                      class="{impliedItem.cls} {impliedItem.implied ?? ''}"
                      on:click={async (e) =>
                        openOrSwitch(app, impliedItem.to, e)}
                      on:mouseover={(e) =>
                        hoverPreview(e, matrixView, impliedItem.to)}
                      aria-label={impliedItem.parent ?? ""}
                      aria-label-position={rlLeaf ? "left" : "right"}
                    >
                      {impliedItem.alt ??
                        dropPathNDendron(impliedItem.to, settings)}
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
  h5.BC-header {
    /* margin: 3px; */
    color: var(--text-title-h5);
  }

  .markdown-preview-view {
    padding-left: 10px;
  }

  .internal-link.is-unresolved {
    color: var(--text-muted);
  }
</style>
