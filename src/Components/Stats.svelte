<script lang="ts">
  import { closeImpliedLinks, complement, copy } from "src/sharedFunctions";

  import type BreadcrumbsPlugin from "src/main";

  export let plugin: BreadcrumbsPlugin;

  const { settings } = plugin;
  const separator = settings.trailSeperator;

  const graphs = plugin.currGraphs;
  const allR = Object.values(graphs);

  const allRNodes = allR.map((g) => g.nodes());

  const allRNodesStr = allRNodes.map((rNodes) => rNodes.join("\n"));

  const allREdges = allR.map((g) => g.edges());

  const allREdgesStr = allREdges.map((edges) =>
    edges.map((e) => `${e.v} → ${e.w}`).join("\n")
  );

  const [closedP, closedS, closedC] = [
    closeImpliedLinks(gParents, gChildren),
    closeImpliedLinks(gSiblings, gSiblings),
    closeImpliedLinks(gChildren, gParents),
  ];
  const allG = [closedP, closedS, closedC];

  const [pANodes, sANodes, cANodes] = allG.map((g) => g.nodes());
  const [pAEdges, sAEdges, cAEdges] = allG.map((g) => g.edges());

  const [pIEdgesStr, sIEdgesStr, cIEdgesStr] = [
    complement(
      pAEdges.map((e) => `${e.v} ${separator} ${e.w}`),
      pREdges.map((e) => `${e.v} ${separator} ${e.w}`)
    ).join("\n"),
    complement(
      sAEdges.map((e) => `${e.v} ${separator} ${e.w}`),
      sREdges.map((e) => `${e.v} ${separator} ${e.w}`)
    ).join("\n"),
    complement(
      cAEdges.map((e) => `${e.v} ${separator} ${e.w}`),
      cREdges.map((e) => `${e.v} ${separator} ${e.w}`)
    ).join("\n"),
  ];
</script>

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
</table>

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
  }
</style>
