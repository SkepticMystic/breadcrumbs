import {Component, Events, MetadataCache, TFile} from "obsidian";
import {
    DataStoreEvents, getPlugin,
    ICoreDataStore,
    IJuggl,
    IJugglPlugin,
    IJugglSettings, IJugglStores,
    nodeDangling,
    nodeFromFile,
    VizId
} from "juggl-api";
import type {MultiGraph} from "graphology";
import type {EdgeDefinition, NodeSingular} from "cytoscape";
import type BCPlugin from "../main";
import {JUGGL_CB_DEFAULTS} from "../constants";
const STORE_ID = "core";


class BCStoreEvents extends Events implements DataStoreEvents {}

class BCStore extends Component implements ICoreDataStore {
    graph: MultiGraph;
    cache: MetadataCache;
    plugin: IJugglPlugin;
    constructor(
        graph: MultiGraph,
        metadata: MetadataCache,
        plugin: IJugglPlugin
    ) {
        super();
        this.graph = graph;
        this.cache = metadata;
        this.plugin = plugin;
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

    getNeighbourhood(nodeId: VizId[]): Promise<cytoscape.NodeDefinition[]> {
        // TODO
        return Promise.resolve([]);
    }

    refreshNode(id: VizId, view: IJuggl): void | Promise<void> {
        return;
    }

    storeId(): string {
        return STORE_ID;
    }

    get(nodeId: VizId, view: IJuggl): Promise<cytoscape.NodeDefinition> {
        const file = this.getFile(nodeId);
        if (file === null) {
            const dangling = nodeDangling(nodeId.id);
            console.log({ dangling });
            return Promise.resolve(nodeDangling(nodeId.id));
        }
        const cache = this.cache.getFileCache(file);
        if (cache === null) {
            console.log("returning empty cache", nodeId);
            return Promise.resolve(nodeDangling(nodeId.id));
        }
        return Promise.resolve(nodeFromFile(file, this.plugin, view.settings, nodeId.toId()));
    }
}

export function createJuggl(
    plugin: BCPlugin,
    target: HTMLElement,
    initialNodes: string[],
    args: IJugglSettings
): IJuggl {
    try {
        const jugglPlugin = getPlugin(plugin.app);
        if (!jugglPlugin) {
            // TODO: Error handling
            return;
        }
        for (let key in JUGGL_CB_DEFAULTS) {
            if (key in args && args[key] === undefined) {
                args[key] = JUGGL_CB_DEFAULTS[key];
            }
        }

        const bcStore = new BCStore(
            plugin.mainG,
            plugin.app.metadataCache,
            jugglPlugin
        );
        const stores: IJugglStores = {
            coreStore: bcStore,
            dataStores: [bcStore],
        };

        console.log({ args }, { initialNodes });
        const juggl = jugglPlugin.createJuggl(target, args, stores, initialNodes);
        plugin.addChild(juggl);
        // juggl.load();
        console.log({ juggl });
        return juggl;
    } catch (error) {
        console.log({ error });
        return null;
    }
}

export function createJugglTrail(
    plugin: BCPlugin,
    target: HTMLElement,
    paths: string[][],
    source: string,
    args: IJugglSettings
) {
    let nodes = Array.from(
        new Set(paths.reduce((prev, curr) => prev.concat(curr), []))
    );
    nodes.push(source);
    nodes = nodes.map((s) => s + ".md");
    const juggl = createJuggl(plugin, target, nodes, args);
    if (juggl) {
        juggl.on("vizReady", (viz) => {
            // After layout is done, center on source node
            viz.one('layoutstop', e => {
                const viz = e.cy;
                const node = viz.$id(VizId.toId(source + ".md", STORE_ID));
                viz.animate({
                    center: {
                        eles: node,
                    },
                    duration: 250,
                    queue: false,
                    zoom: 2
                });
            })
        });
    }
}