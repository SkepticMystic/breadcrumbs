<script lang="ts">
  import type { TFile } from "obsidian";
  import { hoverPreview, openOrSwitch } from "obsidian-community-lib";
  import type { SquareProps } from "../interfaces";
  import { dropPathNDendron } from "../Utils/generalUtils";
  import type MatrixView from "../Views/MatrixView";

  export let hierSquares: SquareProps[][];
  export let currFile: TFile;
  export let matrixView: MatrixView;

  const { plugin } = matrixView;
  const { app, settings } = plugin;
  const {
    showImpliedRelations,
    rlLeaf,
    treatCurrNodeAsImpliedSibling,
    showRelationType,
  } = settings;
</script>

<div
  class="BC-list markdown-preview-view {hierSquares.length
    ? ''
    : 'BC-empty-view'}"
>
  {#each hierSquares as squares}
    <details open>
      <summary class="hier-summary"
        >{squares.map((square) => square.field).join(", ")}</summary
      >

      {#each squares as { field, impliedItems, realItems }}
        {#if realItems.length || (showImpliedRelations && impliedItems.length)}
          <details open class="BC-details">
            <summary>{field}</summary>
            {#if realItems.length}
              {#if showRelationType}
                <h5 class="BC-header">Real</h5>
              {/if}

              <ol>
                {#each realItems as { alt, cls, implied, to }}
                  <li>
                    <div
                      class="{cls} {implied ?? ''}"
                      on:click={async (e) => await openOrSwitch(app, to, e)}
                      on:mouseover={(e) => hoverPreview(e, matrixView, to)}
                    >
                      {alt ?? dropPathNDendron(to, settings)}
                    </div>
                  </li>
                {/each}
              </ol>
            {/if}

            {#if showImpliedRelations && impliedItems.length}
              {#if showRelationType}
                <h5 class="BC-header">Implied</h5>
              {/if}

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
                      on:click={async (e) => await openOrSwitch(app, to, e)}
                      on:mouseover={(e) => hoverPreview(e, matrixView, to)}
                      aria-label={parent ?? ""}
                      aria-label-position={rlLeaf ? "left" : "right"}
                    >
                      {alt ?? dropPathNDendron(to, settings)}
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
    color: var(--text-title-h3);
  }
  h5.BC-header {
    color: var(--text-title-h5);
  }

  .markdown-preview-view {
    padding-left: 10px;
  }

  .internal-link.is-unresolved {
    color: var(--text-muted);
  }
</style>
