import type { EdgeDefinition, NodeSingular } from "cytoscape";
import type { MultiGraph } from "graphology";
import {
  DataStoreEvents,
  getPlugin,
  ICoreDataStore,
  IJuggl,
  IJugglSettings,
  IJugglStores,
  nodeDangling,
  nodeFromFile,
  VizId,
} from "juggl-api";
import { info, warn } from "loglevel";
import { Component, Events, MetadataCache, TFile } from "obsidian";
import { createIndex } from "../Commands/CreateIndex";
import JugglButton from "../Components/JugglButton.svelte";
import JugglDepth from "../Components/JugglDepth.svelte";
import { JUGGL_CB_DEFAULTS } from "../constants";
import type BCPlugin from "../main";
import {
  dfsAllPaths,
  getReflexiveClosure,
  getSubInDirs,
} from "../Utils/graphUtils";
const STORE_ID = "core";

class BCStoreEvents extends Events implements DataStoreEvents { }

export class BCStore extends Component implements ICoreDataStore {
  graph: MultiGraph;
  cache: MetadataCache;
  depthMap: { [value: string]: number };
  constructor(
    graph: MultiGraph,
    metadata: MetadataCache,
    depthMap?: { [value: string]: number }
  ) {
    super();
    this.graph = graph;
    this.cache = metadata;
    this.depthMap = depthMap;
  }

  asString(node: NodeSingular): string {
    const id = VizId.fromNode(node);
    return id.id.slice(0, -3);
  }

  getFile(nodeId: VizId): TFile {
    return this.cache.getFirstLinkpathDest(nodeId.id, "");
  }

  async connectNodes(
    allNodes: cytoscape.NodeCollection,
    newNodes: cytoscape.NodeCollection,
    graph: IJuggl
  ): Promise<cytoscape.EdgeDefinition[]> {
    const edges: EdgeDefinition[] = [];
    const nodesListS = new Set(
      allNodes.map((node) => this.asString(node)).filter((s) => s)
    );
    newNodes.forEach((node) => {
      const name = this.asString(node);
      if (!this.graph.hasNode(name)) {
        return;
      }
      this.graph.forEachOutEdge(
        this.asString(node),
        (key, attr, source, target) => {
          if (nodesListS.has(target)) {
            edges.push({
              data: {
                id: `BC:${source}->${target}`,
                source: VizId.toId(source, STORE_ID) + ".md",
                target: VizId.toId(target, STORE_ID) + ".md",
                type: attr.field,
                dir: attr.dir,
              },
              classes: `type-${attr.field} dir-${attr.dir} breadcrumbs$`,
            });
          }
        }
      );
    });
    return Promise.resolve(edges);
  }

  getEvents(view: IJuggl): DataStoreEvents {
    return new BCStoreEvents();
  }

  async getNeighbourhood(
    nodeIds: VizId[],
    view: IJuggl
  ): Promise<cytoscape.NodeDefinition[]> {
    const new_nodes = [];
    for (const nodeId of nodeIds) {
      const name = nodeId.id.slice(0, -3);
      if (!this.graph.hasNode(name)) {
        continue;
      }
      for (const new_node of this.graph.neighbors(name)) {
        new_nodes.push(
          await this.get(new VizId(new_node + ".md", STORE_ID), view)
        );
      }
    }
    return new_nodes;
  }

  refreshNode(id: VizId, view: IJuggl): void | Promise<void> {
    return;
  }

  storeId(): string {
    return STORE_ID;
  }

  get(nodeId: VizId, view: IJuggl): Promise<cytoscape.NodeDefinition> {
    const file = this.getFile(nodeId);
    let depth = 0;
    if (this.depthMap && nodeId.id in this.depthMap) {
      depth = this.depthMap[nodeId.id];
    }
    if (file === null) {
      const dangling = nodeDangling(nodeId.id);
      dangling.data.depth = depth;
      return Promise.resolve(dangling);
    }
    const cache = this.cache.getFileCache(file);
    if (cache === null) {
      info("returning empty cache", nodeId);
      return Promise.resolve(nodeDangling(nodeId.id));
    }

    return nodeFromFile(file, view.plugin, view.settings, nodeId.toId()).then(
      (node) => {
        node.data.depth = depth;
        return node;
      }
    );
  }
}

export function createJuggl(
  plugin: BCPlugin,
  target: HTMLElement,
  initialNodes: string[],
  args: IJugglSettings,
  depthMap: { [value: string]: number } = null
): IJuggl {
  try {
    const jugglPlugin = getPlugin(app);
    if (!jugglPlugin) {
      // TODO: Error handling
      return;
    }
    for (let key in JUGGL_CB_DEFAULTS) {
      if (key in args && args[key] === undefined)
        args[key] = JUGGL_CB_DEFAULTS[key];
    }

    const bcStore = new BCStore(
      plugin.mainG,
      app.metadataCache,
      depthMap
    );
    const stores: IJugglStores = {
      coreStore: bcStore,
      dataStores: [bcStore],
    };

    const juggl = jugglPlugin.createJuggl(target, args, stores, initialNodes);
    plugin.addChild(juggl);
    info({ juggl });
    return juggl;
  } catch (error) {
    warn({ error });
    return null;
  }
}

function zoomToSource(juggl: IJuggl, source: string) {
  if (!juggl) {
    return;
  }
  juggl.on("vizReady", (viz) => {
    // After layout is done, center on source node
    viz.one("layoutstop", (e) => {
      const viz = e.cy;
      const node = viz.$id(VizId.toId(source + ".md", STORE_ID));
      viz.animate({
        center: {
          eles: node,
        },
        duration: 250,
        queue: false,
        zoom: 1.7,
      });
    });
  });
}

function zoomToGraph(juggl: IJuggl) {
  juggl.on("vizReady", (viz) => {
    viz.fit(viz.nodes());
  });
}

function createDepthMap(
  paths: string[][],
  source: string,
  offset = 0
): { [name: string]: number } {
  // TODO: Is there a BC function for this already?
  let depthMap: { [value: string]: number } = {};
  depthMap[source + ".md"] = 0;
  paths.forEach((path) => {
    for (let i = 0; i < path.length; i++) {
      const name = path[i] + ".md";
      const depth = path.length - i - 1 + offset;
      if (name in depthMap) {
        depthMap[name] = Math.min(depthMap[name], depth);
      } else {
        depthMap[name] = depth;
      }
    }
  });
  return depthMap;
}

function updateDepth(juggl: IJuggl, depth: number) {
  juggl.viz.$(`[depth>${depth}]`).addClass("filtered");
  juggl.viz.$(`[depth<=${depth}]`).removeClass("filtered");
}

export function createJugglTrail(
  plugin: BCPlugin,
  target: HTMLElement,
  paths: string[][],
  source: string,
  args: IJugglSettings
) {
  const toolbarDiv = document.createElement("div");
  toolbarDiv.addClass("cy-toolbar");
  target.appendChild(toolbarDiv);

  const sectDiv = document.createElement("div");
  sectDiv.addClass("cy-toolbar-section");
  toolbarDiv.appendChild(sectDiv);

  const amtChildren = target.children.length;

  let jugglUp: IJuggl = null;
  let jugglDown: IJuggl = null;

  new JugglButton({
    target: sectDiv,
    props: {
      icon: "↑",
      onClick: () => {
        if (jugglUp) {
          target.children[amtChildren].classList.remove("juggl-hide");
          depthUp.$set({ visible: true });
        }
        if (jugglDown) {
          target.children[amtChildren + 1].classList.add("juggl-hide");
          depthDown.$set({ visible: false });
        }
      },
      disabled: false,
      title: "Show up graph",
    },
  });

  new JugglButton({
    target: sectDiv,
    props: {
      icon: "↓",
      onClick: () => {
        if (jugglDown) {
          target.children[amtChildren + 1].classList.remove("juggl-hide");
          depthUp.$set({ visible: false });
          if (jugglUp) {
            target.children[amtChildren].classList.add("juggl-hide");
            depthDown.$set({ visible: true });
          }
          return;
        }
        const sub = getSubInDirs(plugin.mainG, "down", "up");
        const closed = getReflexiveClosure(sub, plugin.settings.userHiers);
        const subClosed = getSubInDirs(closed, "down");


        const { createIndexIndent } = plugin.settings
        const allPaths = dfsAllPaths(subClosed, source);
        const index = createIndex(allPaths, false, createIndexIndent);
        const lines = index
          .split("\n")
          .map((line) => {
            const [indent, ...content] = line.split("- ");
            return content.join("- ");
          })
          .filter((pair) => pair);
        let depthMapDown = createDepthMap(allPaths, source);
        const maxDepthDown = Math.max(...Object.values(depthMapDown));

        depthDown = new JugglDepth({
          target: toolbarDiv,
          props: {
            maxDepth: maxDepthDown,
            onUpdateDepth: (d) => {
              updateDepth(jugglDown, d);
            },
          },
        });
        let nodesS = new Set(lines);
        nodesS.add(source);
        const nodes = Array.from(nodesS).map((s) => s + ".md");

        const argsDown = Object.assign({}, args);
        const layout = plugin.settings.jugglLayout;
        if (layout === "hierarchy") {
          argsDown.layout = {
            // @ts-ignore
            name: "dagre",
            animate: false,
            ranker: (graph) => {
              Object.keys(graph._nodes).forEach((id) => {
                const name = VizId.fromId(id).id;
                if (name in depthMapDown) {
                  graph._nodes[id].rank = depthMapDown[name] + 1;
                } else {
                  graph._nodes[id].rank = 0;
                }
              });
            },
          };
        } else {
          argsDown.layout = layout;
        }
        const isFdgd = layout === "cola" || layout === "d3-force";
        if (isFdgd) {
          // @ts-ignore
          argsDown.fdgdLayout = layout;
          argsDown.layout = "force-directed";
        } else {
          argsDown.autoZoom = true;
          argsDown.animateLayout = false;
        }

        jugglDown = createJuggl(plugin, target, nodes, argsDown, depthMapDown);

        if (isFdgd) {
          zoomToSource(jugglDown, source);
        } else {
          zoomToGraph(jugglDown);
        }

        if (jugglUp) {
          target.children[amtChildren].addClass("juggl-hide");
          depthUp.$set({ visible: false });
        }
      },
      disabled: false,
      title: "Show down graph",
    },
  });
  const depthMapUp = createDepthMap(paths, source, 1);
  const maxDepthUp = Math.max(...Object.values(depthMapUp));

  let depthDown: JugglDepth;
  const depthUp = new JugglDepth({
    target: toolbarDiv,
    props: {
      maxDepth: maxDepthUp,
      onUpdateDepth: (d) => {
        updateDepth(jugglUp, d);
      },
    },
  });

  // new JugglButton({
  //     target: sectDiv,
  //     props: {
  //         icon: "⛶",
  //         onClick: () => {
  //             console.log("here")
  //             target.children[1].addClass("juggl-full-screen")
  //             target.children[1].setAttr("style", "");
  //         },
  //         disabled: false,
  //         title: "Full height"
  //     }
  // });
  let nodes = Array.from(
    new Set(paths.reduce((prev, curr) => prev.concat(curr), []))
  );

  nodes.push(source);
  nodes = nodes.map((s) => s + ".md");

  const argsUp: IJugglSettings = Object.assign({}, args);

  const layout = plugin.settings.jugglLayout;
  if (layout === "hierarchy") {
    argsUp.layout = {
      // @ts-ignore
      name: "dagre",
      animate: false,
      ranker: (graph) => {
        Object.keys(graph._nodes).forEach((id) => {
          const name = VizId.fromId(id).id;
          if (name in depthMapUp) {
            graph._nodes[id].rank = maxDepthUp - depthMapUp[name] + 1;
          } else {
            graph._nodes[id].rank = maxDepthUp + 2;
          }
        });
      },
    };
  } else {
    argsUp.layout = layout;
  }
  const isFdgd = layout === "cola" || layout === "d3-force";
  if (isFdgd) {
    // @ts-ignore
    argsUp.fdgdLayout = layout;
    argsUp.layout = "force-directed";
  } else {
    argsUp.autoZoom = true;
    // @ts-ignore
    argsUp.animateLayout = false;
  }
  jugglUp = createJuggl(plugin, target, nodes, argsUp, depthMapUp);
  if (isFdgd) {
    zoomToSource(jugglUp, source);
  } else {
    zoomToGraph(jugglUp);
  }
}
