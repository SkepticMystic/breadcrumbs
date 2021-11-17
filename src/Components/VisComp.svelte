<script lang="ts">
  import { ALLUNLINKED, REAlCLOSED, RELATIONS, VISTYPES } from "src/constants";
  import type {
    BCSettings,
    VisGraphs,
    visTypes,
  } from "src/interfaces";
  import { closeImpliedLinks, removeUnlinkedNodes } from "src/sharedFunctions";
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
  export let settings: BCSettings;

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

  const { up, same, down } = plugin.currGraphs.mergedGs;

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
