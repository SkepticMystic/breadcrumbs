<script lang="ts">
  import { closeImpliedLinks, complement } from "src/sharedFunctions";

  import type BreadcrumbsPlugin from "src/main";

  export let plugin: BreadcrumbsPlugin;

  const { gParents, gSiblings, gChildren } = plugin.currGraphs;
  const allRG = [gParents, gSiblings, gChildren];

  const [pRNodes, sRNodes, cRNodes] = allRG.map((g) => g.nodes());
  const [pREdges, sREdges, cREdges] = allRG.map((g) => g.edges());

  const [closedP, closedS, closedC] = [
    closeImpliedLinks(gParents, gChildren),
    closeImpliedLinks(gSiblings, gSiblings),
    closeImpliedLinks(gChildren, gParents),
  ];
  const allG = [closedP, closedS, closedC];

  const [pANodes, sANodes, cANodes] = allG.map((g) => g.nodes());
  const [pAEdges, sAEdges, cAEdges] = allG.map((g) => g.edges());
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
    <td>Nodes</td>
    <td title={pRNodes.join("\n")}>{pRNodes.length}</td>
    <td title={sRNodes.join("\n")}>{sRNodes.length}</td>
    <td title={cRNodes.join("\n")}>{cRNodes.length}</td>
    <td>{pRNodes.length + sRNodes.length + cRNodes.length}</td>
  </tr>

  <tr>
    <td>Real Edges</td>
    <td title={pREdges.map((e) => `${e.v} → ${e.w}`).join("\n")}
      >{pREdges.length}</td
    >
    <td title={sREdges.map((e) => `${e.v} → ${e.w}`).join("\n")}
      >{sREdges.length}</td
    >
    <td title={cREdges.map((e) => `${e.v} → ${e.w}`).join("\n")}
      >{cREdges.length}</td
    >
    <td>{pREdges.length + sREdges.length + cREdges.length}</td>
  </tr>

  <tr>
    <td>Implied Edges</td>
    <td
      title={complement(
        pAEdges.map((e) => `${e.v} → ${e.w}`),
        pREdges.map((e) => `${e.v} → ${e.w}`)
      ).join("\n")}>{pAEdges.length - pREdges.length}</td
    >
    <td
      title={complement(
        sAEdges.map((e) => `${e.v} → ${e.w}`),
        sREdges.map((e) => `${e.v} → ${e.w}`)
      ).join("\n")}>{sAEdges.length - sREdges.length}</td
    >
    <td
      title={complement(
        cAEdges.map((e) => `${e.v} → ${e.w}`),
        cREdges.map((e) => `${e.v} → ${e.w}`)
      ).join("\n")}>{cAEdges.length - cREdges.length}</td
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
