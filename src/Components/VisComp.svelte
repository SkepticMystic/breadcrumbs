<script lang="ts">
  import { ALLUNLINKED, REAlCLOSED, RELATIONS, VISTYPES } from "src/constants";
  import type {
    BreadcrumbsSettings,
    VisGraphs,
    visTypes,
  } from "src/interfaces";
  import {
    closeImpliedLinks,
    getAllXGs,
    mergeGs,
    removeUnlinkedNodes,
  } from "src/sharedFunctions";
  import type { VisModal } from "src/VisModal";
  import { arcDiagram } from "src/Visualisations/ArcDiagram";
  import { circlePacking } from "src/Visualisations/CirclePacking";
  import { edgeBundling } from "src/Visualisations/EdgeBundling";
  import { forceDirectedG } from "src/Visualisations/ForceDirectedG";
  import { icicle } from "src/Visualisations/Icicle";
  import { radialTree } from "src/Visualisations/RadialTree";
  import { sunburst } from "src/Visualisations/Sunburst";
  import { tidyTree } from "src/Visualisations/TidyTree";
  import { treeMap } from "src/Visualisations/TreeMap";

  export let modal: VisModal;
  export let settings: BreadcrumbsSettings;

  const { app } = modal;
  const { plugin } = modal;

  const currFile = app.workspace.getActiveFile();

  const selectors = [
    {
      text: "Type",
      options: VISTYPES,
      val: settings.visGraph,
    },
    {
      text: "Relation",
      options: RELATIONS,
      val: settings.visRelation,
    },
    {
      text: "Close Implied",
      options: REAlCLOSED,
      val: settings.visClosed,
    },
    {
      text: "No Unlinked",
      options: ALLUNLINKED,
      val: settings.visAll,
    },
  ];

  const [width, height] = [
    Math.round(window.innerWidth / 1.3),
    Math.round(window.innerHeight / 1.3),
  ];

  const allUps = getAllXGs(plugin, "up");
  const allSames = getAllXGs(plugin, "same");
  const allDowns = getAllXGs(plugin, "down");
  console.log({ allUps, allDowns });

  const upG = mergeGs(...Object.values(allUps));
  const sameG = mergeGs(...Object.values(allSames));
  const downG = mergeGs(...Object.values(allDowns));
  console.log({ upG, downG });

  const [closedParentNoSingle, closedSiblingNoSingle, closedChildNoSingle] = [
    closeImpliedLinks(upG, downG),
    closeImpliedLinks(sameG, sameG),
    closeImpliedLinks(downG, upG),
  ];

  const graphs: VisGraphs = {
    Parent: {
      Real: {
        All: upG,
        "No Unlinked": removeUnlinkedNodes(upG),
      },
      Closed: {
        All: closedParentNoSingle,
        "No Unlinked": removeUnlinkedNodes(closedParentNoSingle),
      },
    },
    Sibling: {
      Real: {
        All: sameG,
        "No Unlinked": removeUnlinkedNodes(sameG),
      },
      Closed: {
        All: closedSiblingNoSingle,
        "No Unlinked": removeUnlinkedNodes(closedSiblingNoSingle),
      },
    },
    Child: {
      Real: {
        All: downG,
        "No Unlinked": removeUnlinkedNodes(downG),
      },
      Closed: {
        All: closedChildNoSingle,
        "No Unlinked": removeUnlinkedNodes(closedChildNoSingle),
      },
    },
  };

  $: argArr = [
    graphs[selectors[1].val][selectors[2].val][selectors[3].val],
    app,
    currFile,
    modal,
    width,
    height,
  ];

  const types: {
    [vis in visTypes]: {
      fun: (...args: any[]) => void;
    };
  } = {
    "Force Directed Graph": {
      fun: forceDirectedG,
    },
    "Tidy Tree": {
      fun: tidyTree,
    },
    "Circle Packing": {
      fun: circlePacking,
    },
    "Edge Bundling": {
      fun: edgeBundling,
    },
    "Arc Diagram": {
      fun: arcDiagram,
    },
    Sunburst: {
      fun: sunburst,
    },
    "Tree Map": {
      fun: treeMap,
    },
    Icicle: {
      fun: icicle,
    },
    "Radial Tree": {
      fun: radialTree,
    },
  };

  function draw(type: visTypes) {
    if (!document.querySelector(".d3-graph")) {
      setTimeout(() => {
        document.querySelector(".d3-graph")?.empty();
        try {
          types[type].fun(...argArr);
        } catch (error) {
          console.log(error);
        }
      }, 10);
    } else {
      document.querySelector(".d3-graph")?.empty();
      try {
        types[type].fun(...argArr);
      } catch (error) {
        console.log(error);
      }
    }
  }

  $: draw(selectors[0].val as visTypes);
</script>

<div>
  {#each selectors as selector}
    <span>
      {selector.text}:
      <!-- svelte-ignore a11y-no-onchange -->
      <select
        value={selector.val}
        on:change={(el) => {
          selector.val = el.target.value;
        }}
      >
        {#each selector.options as op}
          <option value={op}>{op}</option>
        {/each}
      </select>
    </span>
  {/each}
</div>

<div class="d3-graph" />
