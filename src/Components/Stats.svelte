<script lang="ts">
  import { closeImpliedLinks, complement, copy } from "src/sharedFunctions";

  import type BreadcrumbsPlugin from "src/main";

  export let plugin: BreadcrumbsPlugin;

  const { settings } = plugin;
  const separator = settings.trailSeperator;

  const { gParents, gSiblings, gChildren } = plugin.currGraphs;
  const allRG = [gParents, gSiblings, gChildren];

  const [pRNodes, sRNodes, cRNodes] = allRG.map((g) => g.nodes());

  const [pRNodesStr, sRNodesStr, cRNodesStr] = [
    pRNodes.join("\n"),
    sRNodes.join("\n"),
    cRNodes.join("\n"),
  ];

  const [pREdges, sREdges, cREdges] = allRG.map((g) => g.edges());

  const [pREdgesStr, sREdgesStr, cREdgesStr] = [
    pREdges.map((e) => `${e.v} → ${e.w}`).join("\n"),
    sREdges.map((e) => `${e.v} → ${e.w}`).join("\n"),
    cREdges.map((e) => `${e.v} → ${e.w}`).join("\n"),
  ];

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

  /* Source: https://svelte.dev/repl/3153faf7584d40bd8ddebecf39f24ac1?version=3.41.0 */
  [data-tooltip] {
    position: relative;
    /* z-index: 2; */
    white-space: pre-line;
    /* display: block; */
  }

  [data-tooltip]:before,
  [data-tooltip]:after {
    visibility: hidden;
    opacity: 0;
    pointer-events: none;
    transition: 0.2s ease-out;
    transform: translate(-50%, 5px);
  }

  [data-tooltip]:before {
    position: absolute;
    top: 80%;
    /* bottom: 100%; */
    left: 50%;
    margin-bottom: 5px;
    padding: 7px;
    width: fit-content;
    min-width: 200px;
    -webkit-border-radius: 3px;
    -moz-border-radius: 3px;
    border-radius: 3px;
    background-color: var(--background-primary);
    color: var(--text-normal);
    content: attr(data-tooltip);
    text-align: center;
    font-size: var(--font-medium);
    line-height: 1.2;
    transition: 0.2s ease-out;
    z-index: 1;
  }

  /* [data-tooltip]:after {
    position: absolute;
    top: 80%;
    left: 50%;
    width: 0;
    border-top: 5px solid #000;
    border-top: 5px solid hsla(0, 0%, 20%, 0.9);
    border-right: 5px solid transparent;
    border-left: 5px solid transparent;
    background-color: red;
    content: " ";
    font-size: 0;
    line-height: 0;
  } */

  [data-tooltip]:hover:before,
  [data-tooltip]:hover:after {
    visibility: visible;
    opacity: 1;
    transform: translate(-50%, 0);
  }
  [data-tooltip="false"]:hover:before,
  [data-tooltip="false"]:hover:after {
    visibility: hidden;
    opacity: 0;
  }
</style>
