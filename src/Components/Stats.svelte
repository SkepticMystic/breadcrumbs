<!-- <script lang="ts">
  import { sum } from "lodash";
  import { debug } from "loglevel";
  import { copy } from "obsidian-community-lib";
  import { ARROW_DIRECTIONS, DIRECTIONS, STATS_VIEW } from "../constants";
  import { Debugger } from "../Debugger";
  import type { Directions, HierData } from "../interfaces";
  import type BCPlugin from "../main";
  import { refreshIndex } from "../refreshIndex";
  import { closeImpliedLinks, getSubForFields } from "../Utils/graphUtils";
  import { getOppDir, hierToStr } from "../Utils/HierUtils";
  import { makeWiki } from "../Utils/ObsidianUtils";

  export let plugin: BCPlugin;

  const { settings, mainG, db } = plugin;
  const { userHiers, wikilinkIndex } = settings;

  db.start2G("StatsView");
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
        .map((n) => makeWiki(n, wikilinkIndex))
        .join("\n");
    }

    gInfo.edges = gInfo.graph.edges();
    const edgeStrArr = gInfo.graph.mapEdges(
      (k, a, s, t) =>
        `${makeWiki(nodesToo ? s : t, wikilinkIndex)} ${
          ARROW_DIRECTIONS[dir]
        } ${makeWiki(nodesToo ? t : s, wikilinkIndex)}`
    );
    gInfo.edgesStr = edgeStrArr.join("\n");
  }

  const data = settings.userHiers.map((hier) => {
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
      hierData[dir].Closed.graph = closeImpliedLinks(
        mergedInDir,
        dir === "same" ? mergedInDir : mergedInOppDir
      );

      fillInInfo(dir, "Closed", hierData);

      hierData[dir].Implied.graph =
        dir === "same"
          ? closeImpliedLinks(mergedInDir, mergedInDir)
          : mergedInOppDir;

      fillInInfo(dir, "Implied", hierData, false);
    });

    return hierData;
  });

  debug({ data });

  const cellStr = (
    i: number,
    type: "Merged" | "Implied",
    info: "nodesStr" | "edgesStr"
  ) => DIRECTIONS.map((dir) => data[i][dir][type][info]).join("\n");

  let hierStrs: string[] = userHiers.map(hierToStr);
  db.end2G();
</script>

<table>
  <thead>
    <tr>
      <th scope="col">Hierarchy</th>
      <th scope="col" colspan={DIRECTIONS.length + 2}>Count</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <button
          class="icon"
          aria-label="Refresh Stats View (also refreshes Breadcrumbs Index)"
          on:click={async () => {
            await refreshIndex(plugin);
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

    {#each userHiers as hier, i}
      <tr>
        <td rowspan="3">
          {hierStrs[i]}
        </td>
        <td>Nodes</td>
        {#each DIRECTIONS as dir}
          
          <td
            aria-label-position="left"
            aria-label={data[i][dir].Merged.nodesStr}
            on:click={async () => await copy(data[i][dir].Merged.nodesStr)}
          >
            {data[i][dir].Merged.nodes.length}
          </td>
        {/each}
        
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
          
          <td
            aria-label-position="left"
            aria-label={data[i][dir].Merged.edgesStr}
            on:click={async () => await copy(data[i][dir].Merged.edgesStr)}
          >
            {data[i][dir].Merged.edges.length}
          </td>
        {/each}
        
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
          
          <td
            aria-label-position="left"
            aria-label={data[i][dir].Implied.edgesStr}
            on:click={async () => await copy(data[i][dir].Implied.edgesStr)}
          >
            {data[i][dir].Implied.edges.length}
          </td>
        {/each}
        
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
        
        <td
          aria-label-position="left"
          aria-label={data
            .map((datum) => datum[dir].Merged.nodesStr)
            .join("\n")}
          on:click={async () =>
            await copy(
              data.map((datum) => datum[dir].Merged.nodesStr).join("\n")
            )}
        >
          {sum(data.map((datum) => datum[dir].Merged.nodes.length))}
        </td>
      {/each}
    </tr>
    <tr>
      <td>Real Edges</td>
      {#each DIRECTIONS as dir}
        
        <td
          aria-label-position="left"
          aria-label={data
            .map((datum) => datum[dir].Merged.edgesStr)
            .join("\n")}
          on:click={async () =>
            await copy(
              data.map((datum) => datum[dir].Merged.edgesStr).join("\n")
            )}
        >
          {sum(data.map((datum) => datum[dir].Merged.edges.length))}
        </td>
      {/each}
    </tr>
    <tr>
      <td>Implied Edges</td>
      {#each DIRECTIONS as dir}
        
        <td
          aria-label-position="left"
          aria-label={data
            .map((datum) => datum[dir].Implied.edgesStr)
            .join("\n")}
          on:click={async () =>
            await copy(
              data.map((datum) => datum[dir].Implied.edgesStr).join("\n")
            )}
        >
          {sum(data.map((datum) => datum[dir].Implied.edges.length))}
        </td>
      {/each}
    </tr>
  </tbody>
</table>

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
</style> -->
