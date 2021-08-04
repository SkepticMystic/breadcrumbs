import { worker } from "cluster";
import * as d3 from "d3";
import type { Graph } from "graphlib";
import { createTreeHierarchy } from "hierarchy-js";
import { App, Modal, Notice } from "obsidian";
import { ALLUNLINKED, REAlCLOSED, RELATIONS, VISTYPES } from "src/constants";
import type {
  AdjListItem,
  d3Graph,
  d3Node,
  d3Tree,
  VisGraphs,
  visTypes,
} from "src/interfaces";
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
    new Notice(
      "Most of the visualisations don't work. This feature is still very experimental."
    );
    let { contentEl } = this;
    contentEl.empty();

    contentEl.style.width = `${Math.round(screen.width / 1.5)}px`;
    contentEl.style.height = `${Math.round(screen.height / 1.3)}px`;

    const optionsDiv = contentEl.createDiv({ cls: "vis-view-options" });

    optionsDiv.createSpan({ text: "Graph:" });
    const graphSelect = optionsDiv.createEl("select");
    VISTYPES.forEach((type) => {
      graphSelect.createEl("option", { value: type, text: type });
    });
    graphSelect.value = this.plugin.settings.visGraph;

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
        graphs[relationSelect.value][closedSelect.value][unlinkedSelect.value],
        graphSelect.value as visTypes
      );
    });
    closedSelect.addEventListener("change", () => {
      d3GraphDiv.empty();
      this.draw(
        graphs[relationSelect.value][closedSelect.value][unlinkedSelect.value],
        graphSelect.value as visTypes
      );
    });
    unlinkedSelect.addEventListener("change", () => {
      d3GraphDiv.empty();
      this.draw(
        graphs[relationSelect.value][closedSelect.value][unlinkedSelect.value],
        graphSelect.value as visTypes
      );
    });
    graphSelect.addEventListener("change", () => {
      d3GraphDiv.empty();
      this.draw(
        graphs[relationSelect.value][closedSelect.value][unlinkedSelect.value],
        graphSelect.value as visTypes
      );
    });

    // Draw the default value onOpen
    this.draw(
      graphs[relationSelect.value][closedSelect.value][unlinkedSelect.value],
      graphSelect.value as visTypes
    );
  }

  draw(graph: Graph, type: visTypes) {
    let { contentEl } = this;

    const currFile = this.app.workspace.getActiveFile();

    const width = 1000;
    const height = 1000;

    const forceDirectedG = (g: Graph) => {
      console.log({ contentEl });

      const data = this.graphlibToD3(g);

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
          d3
            .forceCenter(
              parseInt(contentEl.style.width) / 2,
              parseInt(contentEl.style.height) / 2
            )
            .strength(0.5)
        );
      const drag = (simulation) => {
        function dragstarted(event, d) {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        }

        function dragged(event, d) {
          d.fx = event.x;
          d.fy = event.y;
        }

        function dragended(event, d) {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }

        return d3
          .drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended);
      };

      const svg = d3
        .select(".d3-graph")
        .append("svg")
        .attr("height", Math.round(screen.height / 1.3))
        .attr("width", contentEl.clientWidth);

      const link = svg
        .append("g")
        .attr("stroke", "#868282")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("stroke-width", (d: d3Node) => Math.sqrt(d.value));

      const nodeColour = getComputedStyle(document.body).getPropertyValue(
        "--text-accent"
      );

      const node = svg
        .append("g")
        .attr("stroke", nodeColour)
        .attr("stroke-width", 1.5)
        .selectAll("circle")
        .data(nodes)
        .join("circle")
        .attr("r", 5)
        .attr("fill", nodeColour)
        .attr("class", "forceDirectedG")
        .call(drag(simulation));

      node.append("title").text((d: d3Node) => d.name);

      simulation.on("tick", () => {
        link
          .attr("x1", (d) => d.source.x)
          .attr("y1", (d) => d.source.y)
          .attr("x2", (d) => d.target.x)
          .attr("y2", (d) => d.target.y);

        node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
      });
    };

    const forceDirectedT = (graph: Graph) => {
      const adjList: AdjListItem[] = this.dfsAdjList(graph, currFile.basename);
      console.log({ adjList });

      const noDoubles = adjList.filter(
        (thing, index, self) =>
          index ===
          self.findIndex(
            (t) => t.name === thing.name && t?.parentId === thing?.parentId
          )
      );
      console.log({ noDoubles });

      const hierarchy: d3Tree = createTreeHierarchy(noDoubles, {
        id: "name",
        excludeParent: true,
      });

      console.log({ hierarchy });

      const root = d3.hierarchy(hierarchy);
      const links = root.links();
      const nodes = root.descendants();

      const drag = (simulation) => {
        function dragstarted(event, d) {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        }

        function dragged(event, d) {
          d.fx = event.x;
          d.fy = event.y;
        }

        function dragended(event, d) {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }

        return d3
          .drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended);
      };

      const simulation = d3
        .forceSimulation(nodes)
        .force(
          "link",
          d3
            .forceLink(links)
            .id((d) => d.id)
            .distance(0)
            .strength(1)
        )
        .force("charge", d3.forceManyBody().strength(-50));
      // .force("x", d3.forceX())
      // .force("y", d3.forceY());

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
        .join("line");

      const node = svg
        .append("g")
        .attr("fill", "#fff")
        .attr("stroke", "#000")
        .attr("stroke-width", 1.5)
        .selectAll("circle")
        .data(nodes)
        .join("circle")
        .attr("fill", (d) => (d.children ? null : "#000"))
        .attr("stroke", (d) => (d.children ? null : "#fff"))
        .attr("r", 3.5)
        .call(drag(simulation));

      node.append("title").text((d) => d.data.name);

      simulation.on("tick", () => {
        link
          .attr("x1", (d) => d.source.x)
          .attr("y1", (d) => d.source.y)
          .attr("x2", (d) => d.target.x)
          .attr("y2", (d) => d.target.y);

        node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
      });

      // invalidation.then(() => simulation.stop());
    };

    const tree = (graph: Graph) => {
      const adjList: AdjListItem[] = this.dfsAdjList(graph, currFile.basename);
      console.log({ adjList });

      const noDoubles = adjList.filter(
        (thing, index, self) =>
          index ===
          self.findIndex(
            (t) => t.name === thing.name && t?.parentId === thing?.parentId
          )
      );
      console.log({ noDoubles });

      const hierarchy: d3Tree = createTreeHierarchy(noDoubles, {
        id: "name",
        excludeParent: true,
      });

      console.log({ hierarchy });

      // const makeRoot = (data: d3Tree) => {
      //   const root = d3.hierarchy(data);
      //   root.dx = 10;
      //   root.dy = width / (root.height + 1);
      //   return d3.tree().nodeSize([root.dx, root.dy])(root);
      // };

      const makeRoot = (hier: d3Tree) => {
        const root = d3.hierarchy(hier);
        root.dx = 10;
        root.dy = 10;
        return d3.tree().nodeSize([root.dx, root.dy])(root);
      };

      const root = makeRoot(hierarchy);

      console.log({ root });

      let x0 = Infinity;
      let x1 = -x0;
      root.each((d) => {
        if (d.x > x1) x1 = d.x;
        if (d.x < x0) x0 = d.x;
      });

      const svg = d3
        .select(".d3-graph")
        .append("svg")
        .attr("height", Math.round(screen.height / 1.3))
        .attr("width", contentEl.clientWidth);

      const g = svg
        .append("g")
        .attr("font-family", "sans-serif")
        .attr("font-size", 10)
        .attr("transform", `translate(${10 / 3},${10 - x0})`);

      const link = g
        .append("g")
        .attr("fill", "none")
        .attr("stroke", "#555")
        .attr("stroke-opacity", 0.4)
        .attr("stroke-width", 1.5)
        .selectAll("path")
        .data(root.links())
        .join("path")
        .attr(
          "d",
          d3
            .linkHorizontal()
            .x((d) => d.y)
            .y((d) => d.x)
        );

      const node = g
        .append("g")
        .attr("stroke-linejoin", "round")
        .attr("stroke-width", 3)
        .selectAll("g")
        .data(root.descendants())
        .join("g")
        .attr("transform", (d) => `translate(${d.y},${d.x})`);

      node
        .append("circle")
        .attr("fill", (d) => (d.children ? "#555" : "#999"))
        .attr("r", 2.5);

      node
        .append("text")
        .attr("dy", "0.31em")
        .attr("x", (d) => (d.children ? -6 : 6))
        .attr("text-anchor", (d) => (d.children ? "end" : "start"))
        .text((d) => d.data.name)
        .clone(true)
        .lower()
        .attr("stroke", "white");
    };

    const circlePacking = (graph: Graph) => {
      const adjList: AdjListItem[] = this.dfsAdjList(graph, currFile.basename);
      console.log({ adjList });

      const noDoubles = adjList.filter(
        (thing, index, self) =>
          index ===
          self.findIndex(
            (t) => t.name === thing.name && t?.parentId === thing?.parentId
          )
      );
      console.log({ noDoubles });

      const hierarchy: d3Tree = createTreeHierarchy(noDoubles, {
        id: "name",
        excludeParent: true,
      });

      console.log({ hierarchy });

      const pack = (data: d3Tree) =>
        d3.pack().size([width, height]).padding(3)(
          d3
            .hierarchy(data)
            .sum((d) => d.value)
            .sort((a, b) => b.value - a.value)
        );

      const root = pack(hierarchy);

      const svg = d3
        .select(".d3-graph")
        .append("svg")
        .attr("height", Math.round(screen.height / 1.3))
        .attr("width", contentEl.clientWidth)
        .style("font", "10px sans-serif")
        .style("overflow", "visible")
        .attr("text-anchor", "middle");

      const node = svg
        .append("g")
        .attr("pointer-events", "all")
        .selectAll("g")
        .data(root.descendants())
        .join("g")
        .attr("transform", (d) => `translate(${d.x},${d.y})`);

      node
        .append("circle")
        .attr("r", (d) => 10)
        .attr("stroke", (d) => (d.children ? "#bbb" : "none"))
        .attr("fill", (d) => (d.children ? "none" : "#ddd"));

      const leaf = node.filter((d) => !d.children);

      leaf.select("circle").attr("id", (d) => (d.leafUid = DOM.uid("leaf")).id);

      leaf
        .append("clipPath")
        .attr("id", (d) => (d.clipUid = DOM.uid("clip")).id)
        .append("use")
        .attr("xlink:href", (d) => d.leafUid.href);

      leaf
        .append("text")
        .attr("clip-path", (d) => d.clipUid)
        .selectAll("tspan")
        .data((d) => d.data.name.split(/(?=[A-Z][^A-Z])/g))
        .join("tspan")
        .attr("x", 0)
        .attr("y", (d, i, nodes) => `${i - nodes.length / 2 + 0.8}em`)
        .text((d) => d);

      node.append("title").text(
        (d) =>
          `${d
            .ancestors()
            .map((d) => d.data.name)
            .reverse()
            .join("/")}${d.value.toLocaleString()}`
      );
    };

    const edgeBundling = (g: Graph) => {
      const adjList: AdjListItem[] = this.dfsAdjList(graph, currFile.basename);
      console.log({ adjList });

      const noDoubles = adjList.filter(
        (thing, index, self) =>
          index ===
          self.findIndex(
            (t) => t.name === thing.name && t?.parentId === thing?.parentId
          )
      );
      console.log({ noDoubles });

      const hierarchy: d3Tree = createTreeHierarchy(noDoubles, {
        id: "name",
        excludeParent: true,
      });

      console.log({ hierarchy });

      const radius = 477;
      const colornone = "#ccc";
      const colorout = "#f00";
      const colorin = "#00f";

      const line = d3
        .lineRadial()
        .curve(d3.curveBundle.beta(0.85))
        .radius((d) => d.y)
        .angle((d) => d.x);

      const clus = d3.cluster().size([2 * Math.PI, radius - 100]);

      const svg = d3
        .select(".d3-graph")
        .append("svg")
        .attr("height", Math.round(screen.height / 1.3))
        .attr("width", contentEl.clientWidth);

      const root = clus(
        bilink(
          d3
            .hierarchy(hierarchy)
            .sort(
              (a, b) =>
                d3.ascending(a.height, b.height) ||
                d3.ascending(a.data.name, b.data.name)
            )
        )
      );

      console.log({ root });

      function id(node) {
        return `${node.parent ? id(node.parent) + "." : ""}${node.data.name}`;
      }

      const node = svg
        .append("g")
        .attr("font-family", "sans-serif")
        .attr("font-size", 10)
        .selectAll("g")
        .data(root.leaves())
        .join("g")
        .attr(
          "transform",
          (d) => `rotate(${(d.x * 180) / Math.PI - 90}) translate(${d.y},0)`
        )
        .append("text")
        .attr("dy", "0.31em")
        .attr("x", (d) => (d.x < Math.PI ? 6 : -6))
        .attr("text-anchor", (d) => (d.x < Math.PI ? "start" : "end"))
        .attr("transform", (d) => (d.x >= Math.PI ? "rotate(180)" : null))
        .text((d) => d.data.name)
        .each(function (d) {
          d.text = this;
        })
        .on("mouseover", overed)
        .on("mouseout", outed)
        .call((text) =>
          text.append("title").text(
            (d) => `${id(d)}
${d.outgoing.length} outgoing
${d.incoming.length} incoming`
          )
        );

      const link = svg
        .append("g")
        .attr("stroke", colornone)
        .attr("fill", "none")
        .selectAll("path")
        .data(root.leaves().flatMap((leaf) => leaf.outgoing))
        .join("path")
        .style("mix-blend-mode", "multiply")
        .attr("d", ([i, o]) => line(i.path(o)))
        .each(function (d) {
          d.path = this;
        });

      function bilink(root) {
        const map = new Map(root.leaves().map((d) => [id(d), d]));
        for (const d of root.leaves())
          (d.incoming = []),
            (d.outgoing = d.data.imports.map((i) => [d, map.get(i)]));
        for (const d of root.leaves())
          for (const o of d.outgoing) o[1].incoming.push(o);
        return root;
      }

      function overed(event, d) {
        link.style("mix-blend-mode", null);
        d3.select(this).attr("font-weight", "bold");
        d3.selectAll(d.incoming.map((d) => d.path))
          .attr("stroke", colorin)
          .raise();
        d3.selectAll(d.incoming.map(([d]) => d.text))
          .attr("fill", colorin)
          .attr("font-weight", "bold");
        d3.selectAll(d.outgoing.map((d) => d.path))
          .attr("stroke", colorout)
          .raise();
        d3.selectAll(d.outgoing.map(([, d]) => d.text))
          .attr("fill", colorout)
          .attr("font-weight", "bold");
      }

      function outed(event, d) {
        link.style("mix-blend-mode", "multiply");
        d3.select(this).attr("font-weight", null);
        d3.selectAll(d.incoming.map((d) => d.path)).attr("stroke", null);
        d3.selectAll(d.incoming.map(([d]) => d.text))
          .attr("fill", null)
          .attr("font-weight", null);
        d3.selectAll(d.outgoing.map((d) => d.path)).attr("stroke", null);
        d3.selectAll(d.outgoing.map(([, d]) => d.text))
          .attr("fill", null)
          .attr("font-weight", null);
      }
    };

    const types: { [vis in visTypes]: (g: Graph) => void } = {
      "Force Directed Graph": forceDirectedG,
      "Force Directed Tree": forceDirectedT,
      Tree: tree,
      "Circle Packing": circlePacking,
      "Edge Bundling": edgeBundling,
    };

    types[type](graph);
  }

  onClose() {
    this.contentEl.empty();
  }
}
