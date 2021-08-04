import * as d3 from "d3";
import type { Graph } from "graphlib";
import { App, Modal } from "obsidian";
import { ALLUNLINKED, REAlCLOSED, RELATIONS } from "src/constants";
import type { AdjListItem, d3Graph, VisGraphs } from "src/interfaces";
import type BreadcrumbsPlugin from "src/main";
import { closeImpliedLinks, removeUnlinkedNodes } from "src/sharedFunctions";

export class VisModal extends Modal {
  plugin: BreadcrumbsPlugin;

  constructor(app: App, plugin: BreadcrumbsPlugin) {
    super(app);
    this.plugin = plugin;
  }

  graphlibToD3(g: Graph): d3Graph {
    const d3Graph: d3Graph = { nodes: [], links: [] };
    const edgeIDs = {};

    g.nodes().forEach((node, i) => {
      d3Graph.nodes.push({ id: i, name: node });
      edgeIDs[node] = i;
    });
    g.edges().forEach((edge) => {
      d3Graph.links.push({
        source: edgeIDs[edge.v],
        target: edgeIDs[edge.w],
      });
    });
    return d3Graph;
  }

  dfsAdjList(g: Graph, startNode: string): AdjListItem[] {
    const queue: string[] = [startNode];
    const adjList: AdjListItem[] = [];

    let i = 0;
    while (queue.length && i < 1000) {
      i++;

      const currNode = queue.shift();
      const newNodes = (g.successors(currNode) ?? []) as string[];

      newNodes.forEach((succ) => {
        const next: AdjListItem = { name: currNode, parentId: succ };
        queue.unshift(succ);
        adjList.push(next);
      });
    }
    return adjList;
  }

  onOpen() {
    let { contentEl } = this;
    contentEl.empty();

    const optionsDiv = contentEl.createDiv({ cls: "vis-view-options" });

    optionsDiv.createSpan({ text: "Relation:" });
    const relationSelect = optionsDiv.createEl("select");
    RELATIONS.forEach((type) => {
      relationSelect.createEl("option", { value: type, text: type });
    });
    relationSelect.value = this.plugin.settings.visRelation;

    optionsDiv.createSpan({ text: "Close Implied:" });
    const closedSelect = optionsDiv.createEl("select");
    REAlCLOSED.forEach((type) => {
      closedSelect.createEl("option", { value: type, text: type });
    });
    closedSelect.value = this.plugin.settings.visClosed;

    optionsDiv.createSpan({ text: "Unlinked:" });
    const unlinkedSelect = optionsDiv.createEl("select");
    ALLUNLINKED.forEach((type) => {
      unlinkedSelect.createEl("option", { value: type, text: type });
    });
    unlinkedSelect.value = this.plugin.settings.visAll;

    const d3GraphDiv = contentEl.createDiv({
      cls: "d3-graph",
    });

    const { gParents, gSiblings, gChildren } = this.plugin.currGraphs;
    // const currFile = this.app.workspace.getActiveFile();

    const [closedParentNoSingle, closedSiblingNoSingle, closedChildNoSingle] = [
      closeImpliedLinks(gParents, gChildren),
      closeImpliedLinks(gSiblings, gSiblings),
      closeImpliedLinks(gChildren, gParents),
    ];

    console.log({ closedSNoS: removeUnlinkedNodes(closedSiblingNoSingle) });

    const graphs: VisGraphs = {
      Parent: {
        Real: {
          All: gParents,
          "No Unlinked": removeUnlinkedNodes(gParents),
        },
        Closed: {
          All: closedParentNoSingle,
          "No Unlinked": removeUnlinkedNodes(closedParentNoSingle),
        },
      },
      Sibling: {
        Real: {
          All: gSiblings,
          "No Unlinked": removeUnlinkedNodes(gSiblings),
        },
        Closed: {
          All: closedSiblingNoSingle,
          "No Unlinked": removeUnlinkedNodes(closedSiblingNoSingle),
        },
      },
      Child: {
        Real: {
          All: gChildren,
          "No Unlinked": removeUnlinkedNodes(gChildren),
        },
        Closed: {
          All: closedChildNoSingle,
          "No Unlinked": removeUnlinkedNodes(closedChildNoSingle),
        },
      },
    };

    relationSelect.addEventListener("change", () => {
      d3GraphDiv.empty();
      this.draw(
        graphs[relationSelect.value][closedSelect.value][unlinkedSelect.value]
      );
    });
    closedSelect.addEventListener("change", () => {
      d3GraphDiv.empty();
      this.draw(
        graphs[relationSelect.value][closedSelect.value][unlinkedSelect.value]
      );
    });
    unlinkedSelect.addEventListener("change", () => {
      d3GraphDiv.empty();
      this.draw(
        graphs[relationSelect.value][closedSelect.value][unlinkedSelect.value]
      );
    });

    // Draw the default value onOpen
    this.draw(
      graphs[relationSelect.value][closedSelect.value][unlinkedSelect.value]
    );

    // const adjList: AdjListItem[] = dfsAdjList(closedParents, currFile.basename);
    // console.log({ adjList });

    // const noDoubles = adjList.filter(
    //   (thing, index, self) =>
    //     index ===
    //     self.findIndex(
    //       (t) => t.name === thing.name && t?.parentId === thing?.parentId
    //     )
    // );
    // console.log({ noDoubles });
    // console.time("tree");
    // const hierarchy = createTreeHierarchy(noDoubles, {
    //   id: "name",
    //   excludeParent: true,
    // });
    // console.timeEnd("tree");
    // console.log({ hierarchy });
  }

  draw(graph: Graph) {
    let { contentEl } = this;

    const data = this.graphlibToD3(graph);

    const width = 1000;
    const height = 1000;

    contentEl.style.width = `${Math.round(screen.width / 1.5)}px`;
    contentEl.style.height = `${Math.round(screen.height / 1.3)}px`;

    const links = data.links.map((d) => Object.create(d));
    const nodes = data.nodes.map((d) => Object.create(d));

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3.forceLink(links).id((d) => d.id)
      )
      .force("charge", d3.forceManyBody())
      .force(
        "center",
        d3.forceCenter(
          parseInt(contentEl.style.width) / 2,
          parseInt(contentEl.style.height) / 2
        )
      );

    const svg = d3
      .select(".d3-graph")
      .append("svg")
      .attr("height", Math.round(screen.height / 1.3))
      .attr("width", contentEl.clientWidth);

    const link = svg
      .append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", (d) => Math.sqrt(d.value));

    const node = svg
      .append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", 5)
      .attr("fill", "#e6e6e6");
    // .call(drag(simulation));

    node.append("title").text((d) => d.id);

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    });

    var tooltip = d3
      .select(".d3-graph")
      .append("div")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .text("I'm a circle!");

    tooltip
      .style("top", d3.select(window).attr("cy") + "px")
      .style("left", d3.select(window).attr("cx") + "px");
  }

  onClose() {
    this.contentEl.empty();
  }
}
