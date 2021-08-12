<script lang="ts">
  import type { Edge, Graph } from "graphlib";
  import { sum } from "lodash";
  import type { Directions } from "src/interfaces";
  import { DIRECTIONS } from "src/constants";
  import type BreadcrumbsPlugin from "src/main";
  import {
    closeImpliedLinks,
    complement,
    copy,
    hierToStr,
    mergeGs,
  } from "src/sharedFunctions";

  export let plugin: BreadcrumbsPlugin;

  const { settings } = plugin;
  const { userHierarchies } = settings;
  const separator = settings.trailSeperator;

  const hierGs = plugin.currGraphs;

  function fillInInfo(
    dir: Directions,
    gType: string,
    hierData: {
      [dir in Directions]: {
        [graphs: string]: {
          graph?: Graph;
          nodes: string[];
          nodesStr: string;
          edges: Edge[];
          edgesStr: string;
        };
      };
    }
  ) {
    const g = hierData[dir][gType].graph;

    hierData[dir][gType].nodes = hierData[dir][gType].graph.nodes();
    hierData[dir][gType].nodesStr = hierData[dir][gType].nodes.join("\n");

    hierData[dir][gType].edges = hierData[dir][gType].graph.edges();
    hierData[dir][gType].edgesStr = hierData[dir][gType].edges
      .map((e) => `${e.v} → ${e.w}`)
      .join("\n");
  }

  const data = hierGs.map((hier) => {
    const hierData: {
      [dir in Directions]: {
        [graphs: string]: {
          graph?: Graph;
          nodes: string[];
          nodesStr: string;
          edges: Edge[];
          edgesStr: string;
        };
      };
    } = {
      up: { Merged: {}, Closed: {}, Implied: {} },
      same: { Merged: {}, Closed: {}, Implied: {} },
      down: { Merged: {}, Closed: {}, Implied: {} },
    };
    DIRECTIONS.forEach((dir) => {
      // Merged Graphs
      /// Smoosh all fieldGs from one dir into a merged graph for that direction as a whole
      hierData[dir].Merged.graph = mergeGs(...Object.values(hier[dir]));
      fillInInfo(dir, "Merged", hierData);

      // Closed graphs
      if (dir !== "same") {
        hierData[dir].Closed.graph = closeImpliedLinks(
          hierData[dir].Merged.graph,
          mergeGs(...Object.values(hier[dir === "up" ? "down" : "up"]))
        );
      } else {
        hierData[dir].Closed.graph = closeImpliedLinks(
          hierData[dir].Merged.graph,
          hierData[dir].Merged.graph
        );
      }
      fillInInfo(dir, "Closed", hierData);
    });

    return hierData;
  });

  console.log({ data });

  let hierStrs: string[] = userHierarchies.map(hierToStr);
  console.log({ hierStrs });

  const allUpGs = hierGs
    .map((hier) => hier.up)
    .map((fields) => Object.values(fields));

  console.log({ allUpGs });

  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //

  //   const allR = Object.values(graphs);

  //   const allRNodes = allR.map((g) => g.nodes());

  //   const allRNodesStr = allRNodes.map((rNodes) => rNodes.join("\n"));

  //   const allREdges = allR.map((g) => g.edges());

  //   const allREdgesStr = allREdges.map((edges) =>
  //     edges.map((e) => `${e.v} → ${e.w}`).join("\n")
  //   );

  //   const [closedP, closedS, closedC] = [
  //     closeImpliedLinks(gParents, gChildren),
  //     closeImpliedLinks(gSiblings, gSiblings),
  //     closeImpliedLinks(gChildren, gParents),
  //   ];
  //   const allG = [closedP, closedS, closedC];

  //   const [pANodes, sANodes, cANodes] = allG.map((g) => g.nodes());
  //   const [pAEdges, sAEdges, cAEdges] = allG.map((g) => g.edges());

  //   const [pIEdgesStr, sIEdgesStr, cIEdgesStr] = [
  //     complement(
  //       pAEdges.map((e) => `${e.v} ${separator} ${e.w}`),
  //       pREdges.map((e) => `${e.v} ${separator} ${e.w}`)
  //     ).join("\n"),
  //     complement(
  //       sAEdges.map((e) => `${e.v} ${separator} ${e.w}`),
  //       sREdges.map((e) => `${e.v} ${separator} ${e.w}`)
  //     ).join("\n"),
  //     complement(
  //       cAEdges.map((e) => `${e.v} ${separator} ${e.w}`),
  //       cREdges.map((e) => `${e.v} ${separator} ${e.w}`)
  //     ).join("\n"),
  //   ];
</script>

<table>
  <thead>
    <tr>
      <th scope="col">Hierarchy</th>
      <th scope="col" colspan="5">Count</th>
    </tr>
  </thead>

  <tr>
    <td />
    <td>Measure</td>
    <td>Up</td>
    <td>Same</td>
    <td>Down</td>
    <td>Total</td>
  </tr>

  {#each userHierarchies as hier, i}
    <tr>
      <td rowspan="2">
        {hierStrs[i]}
      </td>
      <td>Real Nodes</td>
      {#each ["up", "same", "down"] as dir}
        <td
          aria-label={data[i][dir].Merged.nodesStr}
          on:click={async () => await copy(data[i][dir].Merged.nodesStr)}
        >
          {data[i][dir].Merged.nodes.length}
        </td>
      {/each}
      <td
        aria-label={[
          data[i].up.Merged.nodesStr,
          data[i].same.Merged.nodesStr,
          data[i].down.Merged.nodesStr,
        ].join("\n")}
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
      </td>
    </tr>
    <tr>
      <td>Edges</td>
      {#each ["up", "same", "down"] as dir}
        <td
          aria-label={data[i][dir].Merged.edgesStr}
          on:click={async () => await copy(data[i][dir].Merged.edgesStr)}
        >
          {data[i][dir].Merged.edges.length}
        </td>
      {/each}
      <td
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
      </td>
    </tr>
  {/each}
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
  }

  td:first-child {
    text-align: right;
  }
  td,
  th {
    padding: 3px;
    border: 1px solid var(--text-accent);
    white-space: pre-line;
  }

  td.filler {
    opacity: 0;
  }
</style>
