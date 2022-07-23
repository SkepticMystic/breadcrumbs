<script lang="ts">
  import { warn } from "loglevel";
  import { ALLUNLINKED, REAlCLOSED, RELATIONS, VISTYPES } from "../constants";
  import type { VisGraphs, visTypes } from "../interfaces";
  import {
    closeImpliedLinks,
    getSubInDirs,
    removeUnlinkedNodes,
  } from "../Utils/graphUtils";
  import { arcDiagram } from "../Visualisations/ArcDiagram";
  import { circlePacking } from "../Visualisations/CirclePacking";
  import { edgeBundling } from "../Visualisations/EdgeBundling";
  import { forceDirectedG } from "../Visualisations/ForceDirectedG";
  import { icicle } from "../Visualisations/Icicle";
  import { radialTree } from "../Visualisations/RadialTree";
  import { sunburst } from "../Visualisations/Sunburst";
  import { tidyTree } from "../Visualisations/TidyTree";
  import { treeMap } from "../Visualisations/TreeMap";
  import type { VisModal } from "../Visualisations/VisModal";
  import { getCurrFile } from "../Utils/ObsidianUtils";

  export let modal: VisModal;

  const { plugin } = modal;
  const { mainG, settings } = plugin;
  const { visGraph, visRelation, visClosed, visAll } = settings;

  const currFile = getCurrFile();

  const selectors = [
    {
      text: "Type",
      options: VISTYPES,
      val: visGraph,
    },
    {
      text: "Relation",
      options: RELATIONS,
      val: visRelation,
    },
    {
      text: "Close Implied",
      options: REAlCLOSED,
      val: visClosed,
    },
    {
      text: "No Unlinked",
      options: ALLUNLINKED,
      val: visAll,
    },
  ];

  const [width, height] = [
    Math.round(window.innerWidth / 1.3),
    Math.round(window.innerHeight / 1.3),
  ];

  const [up, same, down] = [
    getSubInDirs(mainG, "up"),
    getSubInDirs(mainG, "same"),
    getSubInDirs(mainG, "down"),
  ];

  const [closedParentNoSingle, closedSiblingNoSingle, closedChildNoSingle] = [
    closeImpliedLinks(up, down),
    closeImpliedLinks(same, same),
    closeImpliedLinks(down, up),
  ];

  const graphs: VisGraphs = {
    Parent: {
      Real: {
        All: up,
        "No Unlinked": removeUnlinkedNodes(up),
      },
      Closed: {
        All: closedParentNoSingle,
        "No Unlinked": removeUnlinkedNodes(closedParentNoSingle),
      },
    },
    Sibling: {
      Real: {
        All: same,
        "No Unlinked": removeUnlinkedNodes(same),
      },
      Closed: {
        All: closedSiblingNoSingle,
        "No Unlinked": removeUnlinkedNodes(closedSiblingNoSingle),
      },
    },
    Child: {
      Real: {
        All: down,
        "No Unlinked": removeUnlinkedNodes(down),
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
    [vis in visTypes]: (...args: any[]) => void;
  } = {
    "Force Directed Graph": forceDirectedG,
    "Tidy Tree": tidyTree,
    "Circle Packing": circlePacking,
    "Edge Bundling": edgeBundling,
    "Arc Diagram": arcDiagram,
    Sunburst: sunburst,
    "Tree Map": treeMap,
    Icicle: icicle,
    "Radial Tree": radialTree,
  };

  function draw(type: visTypes) {
    if (!document.querySelector(".d3-graph")) {
      setTimeout(() => {
        document.querySelector(".d3-graph")?.empty();
        try {
          types[type](...argArr);
        } catch (error) {
          warn(error);
        }
      }, 10);
    } else {
      document.querySelector(".d3-graph").empty();
      try {
        types[type](...argArr);
      } catch (error) {
        warn(error);
      }
    }
  }

  $: draw(selectors[0].val as visTypes);
</script>

<div>
  {#each selectors as { text, options, val }}
    <span>
      {text}:
      <select bind:value={val}>
        {#each options as op}
          <option value={op}>{op}</option>
        {/each}
      </select>
    </span>
  {/each}
</div>

<div class="d3-graph" />
