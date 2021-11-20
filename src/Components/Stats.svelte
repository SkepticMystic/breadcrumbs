<script lang="ts">
  import { sum } from "lodash";
  import { ARROW_DIRECTIONS, DIRECTIONS, STATS_VIEW } from "src/constants";
  import type { Directions, HierData } from "src/interfaces";
  import type BCPlugin from "src/main";
  import {
    closeImpliedLinks,
    copy,
    debug,
    getOppDir,
    getSubForFields,
    hierToStr,
    makeWiki,
  } from "src/sharedFunctions";

  export let plugin: BCPlugin;

  const { settings, mainG } = plugin;
  const { userHierarchies, trailSeperator } = settings;

  function fillInInfo(
    dir: Directions,
    gType: string,
    hierData: HierData,
    nodesToo = true
  ) {
    const gInfo = hierData[dir][gType];

    if (nodesToo) {
      gInfo.nodes = gInfo.graph.nodes();
      gInfo.nodesStr = gInfo.nodes
        .map((n) => makeWiki(settings.wikilinkIndex, n))
        .join("\n");
    }

    gInfo.edges = gInfo.graph.edges();
    const edgeStrArr = gInfo.graph.mapEdges(
      (k, a, s, t) =>
        `${makeWiki(settings.wikilinkIndex, nodesToo ? s : t)} ${
          nodesToo || dir !== "same" ? trailSeperator : "⟷"
        } ${makeWiki(settings.wikilinkIndex, nodesToo ? t : s)}`
    );
    gInfo.edgesStr = edgeStrArr.join("\n");
  }

  const data = settings.userHierarchies.map((hier) => {
    const hierData: HierData = {
      //@ts-ignore
      up: { Merged: {}, Closed: {}, Implied: {} },
      //@ts-ignore
      same: { Merged: {}, Closed: {}, Implied: {} },
      //@ts-ignore
      down: { Merged: {}, Closed: {}, Implied: {} },
      //@ts-ignore
      next: { Merged: {}, Closed: {}, Implied: {} },
      //@ts-ignore
      prev: { Merged: {}, Closed: {}, Implied: {} },
    };
    DIRECTIONS.forEach((dir) => {
      // Merged Graphs
      /// Smoosh all fieldGs from one dir into a merged graph for that direction as a whole

      const mergedInDir = getSubForFields(mainG, hier[dir]);
      const mergedInOppDir = getSubForFields(mainG, hier[getOppDir(dir)]);
      hierData[dir].Merged.graph = mergedInDir;
      fillInInfo(dir, "Merged", hierData);

      // Closed graphs
      if (dir !== "same") {
        hierData[dir].Closed.graph = closeImpliedLinks(
          mergedInDir,
          mergedInOppDir
        );
      } else {
        hierData[dir].Closed.graph = closeImpliedLinks(
          mergedInDir,
          mergedInDir
        );
      }
      fillInInfo(dir, "Closed", hierData);

      if (dir !== "same") {
        hierData[dir].Implied.graph = mergedInOppDir;
      } else {
        hierData[dir].Implied.graph = closeImpliedLinks(
          mergedInDir,
          mergedInDir
        );
      }
      fillInInfo(dir, "Implied", hierData, false);
    });

    return hierData;
  });

  debug(settings, { data });

  const cellStr = (
    i: number,
    type: "Merged" | "Implied",
    info: "nodesStr" | "edgesStr"
  ) => DIRECTIONS.map((dir) => data[i][dir][type][info]).join("\n");

  let hierStrs: string[] = userHierarchies.map(hierToStr);
</script>

<table>
  <thead>
    <tr>
      <th scope="col">Hierarchy</th>
      <th scope="col" colspan={DIRECTIONS.length + 2}>Count</th>
    </tr>
  </thead>

  <tr>
    <td>
      <button
        class="icon"
        aria-label="Refresh Stats View (also refreshes Breadcrumbs Index)"
        on:click={async () => {
          await plugin.refreshIndex();
          await plugin.getActiveTYPEView(STATS_VIEW)?.draw();
        }}
      >
        ↻
      </button>
    </td>
    <td>Measure</td>
    {#each DIRECTIONS as dir}
      <td>{ARROW_DIRECTIONS[dir]}</td>
    {/each}
    <td>Total</td>
  </tr>

  {#each userHierarchies as hier, i}
    <tr>
      <td rowspan="3">
        {hierStrs[i]}
      </td>
      <td>Nodes</td>
      {#each DIRECTIONS as dir}
        <!-- svelte-ignore a11y-unknown-aria-attribute -->
        <td
          aria-label-position="left"
          aria-label={data[i][dir].Merged.nodesStr}
          on:click={async () => await copy(data[i][dir].Merged.nodesStr)}
        >
          {data[i][dir].Merged.nodes.length}
        </td>
      {/each}
      <!-- svelte-ignore a11y-unknown-aria-attribute -->
      <td
        aria-label-position="left"
        aria-label={cellStr(i, "Merged", "nodesStr")}
        on:click={async () => await copy(cellStr(i, "Merged", "nodesStr"))}
      >
        {sum(DIRECTIONS.map((dir) => data[i][dir].Merged.nodes.length))}
      </td>
    </tr>
    <tr>
      <td>Real Edges</td>
      {#each DIRECTIONS as dir}
        <!-- svelte-ignore a11y-unknown-aria-attribute -->
        <td
          aria-label-position="left"
          aria-label={data[i][dir].Merged.edgesStr}
          on:click={async () => await copy(data[i][dir].Merged.edgesStr)}
        >
          {data[i][dir].Merged.edges.length}
        </td>
      {/each}
      <!-- svelte-ignore a11y-unknown-aria-attribute -->
      <td
        aria-label-position="left"
        aria-label={cellStr(i, "Merged", "edgesStr")}
        on:click={async () => await copy(cellStr(i, "Merged", "edgesStr"))}
      >
        {sum(DIRECTIONS.map((dir) => data[i][dir].Merged.edges.length))}
      </td>
    </tr>
    <tr>
      <td>Implied Edges</td>
      {#each DIRECTIONS as dir}
        <!-- svelte-ignore a11y-unknown-aria-attribute -->
        <td
          aria-label-position="left"
          aria-label={data[i][dir].Implied.edgesStr}
          on:click={async () => await copy(data[i][dir].Implied.edgesStr)}
        >
          {data[i][dir].Implied.edges.length}
        </td>
      {/each}
      <!-- svelte-ignore a11y-unknown-aria-attribute -->
      <td
        aria-label-position="left"
        aria-label={cellStr(i, "Implied", "edgesStr")}
        on:click={async () => await copy(cellStr(i, "Implied", "edgesStr"))}
      >
        {sum(DIRECTIONS.map((dir) => data[i][dir].Implied.edges.length))}
      </td>
    </tr>
  {/each}
  <tr>
    <td rowspan="3"> Totals </td>
    <td>Nodes</td>
    {#each DIRECTIONS as dir}
      <!-- svelte-ignore a11y-unknown-aria-attribute -->
      <td
        aria-label-position="left"
        aria-label={data.map((datum) => datum[dir].Merged.nodesStr).join("\n")}
        on:click={async () =>
          await copy(
            data.map((datum) => datum[dir].Merged.nodesStr).join("\n")
          )}
      >
        {sum(data.map((datum) => datum[dir].Merged.nodes.length))}
      </td>
    {/each}
    <!-- <td
      aria-label-position='left'
      aria-label={
        ''
      // [
      //   data[i].up.Merged.nodesStr,
      //   data[i].same.Merged.nodesStr,
      //   data[i].down.Merged.nodesStr,
      // ].join("\n")
      // }
      }
      on:click={async () =>
        await copy(
          [
            data[i].up.Merged.nodesStr,
            data[i].same.Merged.nodesStr,
            data[i].down.Merged.nodesStr,
          ].join("\n")
        )}
    >
      {[
        ...data[i].up.Merged.nodes,
        ...data[i].same.Merged.nodes,
        ...data[i].down.Merged.nodes,
      ].length}
    </td> -->
  </tr>
  <tr>
    <td>Real Edges</td>
    {#each DIRECTIONS as dir}
      <!-- svelte-ignore a11y-unknown-aria-attribute -->
      <td
        aria-label-position="left"
        aria-label={data.map((datum) => datum[dir].Merged.edgesStr).join("\n")}
        on:click={async () =>
          await copy(
            data.map((datum) => datum[dir].Merged.edgesStr).join("\n")
          )}
      >
        {sum(data.map((datum) => datum[dir].Merged.edges.length))}
      </td>
    {/each}
    <!-- <td
      aria-label-position='left'
      aria-label={[
        data[i].up.Merged.edgesStr,
        data[i].same.Merged.edgesStr,
        data[i].down.Merged.edgesStr,
      ].join("\n")}
      on:click={async () =>
        await copy(
          [
            data[i].up.Merged.edgesStr,
            data[i].same.Merged.edgesStr,
            data[i].down.Merged.edgesStr,
          ].join("\n")
        )}
    >
      {[
        ...data[i].up.Merged.edges,
        ...data[i].same.Merged.edges,
        ...data[i].down.Merged.edges,
      ].length}
    </td> -->
  </tr>
  <tr>
    <td>Implied Edges</td>
    {#each DIRECTIONS as dir}
      <!-- svelte-ignore a11y-unknown-aria-attribute -->
      <td
        aria-label-position="left"
        aria-label={data.map((datum) => datum[dir].Implied.edgesStr).join("\n")}
        on:click={async () =>
          await copy(
            data.map((datum) => datum[dir].Implied.edgesStr).join("\n")
          )}
      >
        {sum(data.map((datum) => datum[dir].Implied.edges.length))}
      </td>
    {/each}
    <!-- <td
      aria-label-position='left'
      aria-label={[
        data[i].up.Implied.edgesStr,
        data[i].same.Implied.edgesStr,
        data[i].down.Implied.edgesStr,
      ].join("\n")}
      on:click={async () =>
        await copy(
          [
            data[i].up.Implied.edgesStr,
            data[i].same.Implied.edgesStr,
            data[i].down.Implied.edgesStr,
          ].join("\n")
        )}
    >
      {[
        ...data[i].up.Implied.edges,
        ...data[i].same.Implied.edges,
        ...data[i].down.Implied.edges,
      ].length}
    </td> -->
  </tr>
</table>

<!-- 
<table>
  <thead>
    <tr>
      <th scope="col">Measure</th>
      <th scope="col">Parent</th>
      <th scope="col">Sibling</th>
      <th scope="col">Child</th>
      <th scope="col">Total</th>
    </tr>
  </thead>

  <tr>
    <td><strong>Nodes</strong></td>
    <td data-tooltip={pRNodesStr} on:click={async () => await copy(pRNodesStr)}
      >{pRNodes.length}</td
    >
    <td data-tooltip={sRNodesStr} on:click={async () => await copy(sRNodesStr)}
      >{sRNodes.length}</td
    >
    <td data-tooltip={cRNodesStr} on:click={async () => await copy(cRNodesStr)}
      >{cRNodes.length}</td
    >
    <td>{pRNodes.length + sRNodes.length + cRNodes.length}</td>
  </tr>

  <tr>
    <td><strong>Real Edges</strong></td>
    <td data-tooltip={pREdgesStr} on:click={async () => await copy(pREdgesStr)}
      >{pREdges.length}</td
    >
    <td data-tooltip={sREdgesStr} on:click={async () => await copy(sREdgesStr)}
      >{sREdges.length}</td
    >
    <td data-tooltip={cREdgesStr} on:click={async () => await copy(cREdgesStr)}
      >{cREdges.length}</td
    >
    <td>{pREdges.length + sREdges.length + cREdges.length}</td>
  </tr>

  <tr>
    <td><strong>Implied Edges</strong></td>
    <td data-tooltip={pIEdgesStr} on:click={async () => await copy(pIEdgesStr)}
      >{pAEdges.length - pREdges.length}</td
    >
    <td data-tooltip={sIEdgesStr} on:click={async () => await copy(sIEdgesStr)}
      >{sAEdges.length - sREdges.length}</td
    >
    <td data-tooltip={cIEdgesStr} on:click={async () => await copy(cIEdgesStr)}
      >{cAEdges.length - cREdges.length}</td
    >
    <td>{pREdges.length + sREdges.length + cREdges.length}</td>
  </tr>
</table> -->
<style>
  table {
    border-collapse: collapse;
  }

  td:first-child {
    text-align: right;
  }
  td,
  th {
    padding: 3px;
    border: 1px solid var(--background-modifier-border);
    white-space: pre-line;
  }

  td.filler {
    opacity: 0;
  }
</style>
