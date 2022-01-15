import type { EdgeDefinition, NodeSingular } from "cytoscape";
import type { MultiGraph } from "graphology";
import {
  DataStoreEvents,
  getPlugin,
  ICoreDataStore,
  IJuggl,
  IJugglPlugin,
  IJugglSettings,
  IJugglStores,
  nodeDangling,
  nodeFromFile,
  VizId,
} from "juggl-api";
import { info } from "loglevel";
import {
  Component,
  Events,
  MarkdownPostProcessorContext,
  MetadataCache,
  Notice,
  TFile,
} from "obsidian";
import CBTree from "./Components/CBTree.svelte";
import {
  CODEBLOCK_FIELDS,
  CODEBLOCK_TYPES,
  DIRECTIONS,
  JUGGL_CB_DEFAULTS,
} from "./constants";
import { createIndex } from "./Commands/CreateIndex";
import {
  dfsAllPaths,
  getFieldInfo,
  getOppDir,
  getReflexiveClosure,
  getSubInDirs,
} from "./graphUtils";
import type { CodeblockFields, ParsedCodeblock } from "./interfaces";
import type BCPlugin from "./main";
import { dropFolder, getFields, splitAndTrim } from "./sharedFunctions";

export function getCodeblockCB(plugin: BCPlugin) {
  const { settings } = plugin;
  return (
    source: string,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext
  ) => {
    const parsedSource = parseCodeBlockSource(source);
    console.log(parsedSource);
    const err = codeblockError(plugin, parsedSource);

    if (err !== "") {
      el.innerHTML = err;
      return;
    }
    let min = 0,
      max = Infinity;
    let { depth, dir, from, implied, flat } = parsedSource;
    if (depth !== undefined) {
      const minNum = parseInt(depth[0]);
      if (!isNaN(minNum)) min = minNum;
      const maxNum = parseInt(depth[1]);
      if (!isNaN(maxNum)) max = maxNum;
    }

    const currFile = plugin.app.metadataCache.getFirstLinkpathDest(
      ctx.sourcePath,
      ""
    );
    const { userHiers } = settings;
    const { basename } = currFile;

    let froms = undefined;
    if (from !== undefined) {
      try {
        const api = plugin.app.plugins.plugins.dataview?.api;
        if (api) {
          const pages = api.pagePaths(from)?.values;
          froms = pages.map(dropFolder);
        } else new Notice("Dataview must be enabled for `from` to work.");
      } catch (e) {
        new Notice(`The query "${from}" failed.`);
      }
    }

    const oppDir = getOppDir(dir);
    const sub =
      implied === "false"
        ? getSubInDirs(plugin.mainG, dir)
        : getSubInDirs(plugin.mainG, dir, oppDir);
    const closed = getReflexiveClosure(sub, userHiers);
    const subClosed = getSubInDirs(closed, dir);

    const allPaths = dfsAllPaths(subClosed, basename);
    const index = createIndex(allPaths, false);
    info({ allPaths, index });
    console.log({ allPaths, index });
    const lines = index
      .split("\n")
      .map((line) => {
        const pair = line.split("- ");
        return [flat === "true" ? "" : pair[0], pair.slice(1).join("- ")] as [
          string,
          string
        ];
      })
      .filter((pair) => pair[1] !== "");

    switch (parsedSource.type) {
      case "tree":
        new CBTree({
          target: el,
          props: {
            plugin,
            el,
            min,
            max,
            lines,
            froms,
            basename,
            ...parsedSource,
          },
        });
        break;
      case "juggl":
        createdJugglCB(
          plugin,
          el,
          parsedSource,
          lines,
          froms,
          basename,
          min,
          max
        );
        break;
    }
  };
}

function parseCodeBlockSource(source: string): ParsedCodeblock {
  const lines = source.split("\n");
  const getValue = (type: string) =>
    lines
      .find((l) => l.startsWith(`${type}:`))
      ?.split(":")?.[1]
      ?.trim();

  const results: { [field in CodeblockFields]: string | boolean | string[] } =
    {};
  CODEBLOCK_FIELDS.forEach((field) => {
    results[field] = getValue(field);
    if (results[field] === "false") {
      results[field] = false;
    }
    if (results[field] === "true") {
      results[field] = true;
    }
  });

  results.field = results.field
    ? splitAndTrim(results.field as string)
    : undefined;

  if (results.depth) {
    const match = (results.depth as string).match(/(\d*)-?(\d*)/);
    results.depth = [match[1], match[2]];
  }

  return results as unknown as ParsedCodeblock;
}

function codeblockError(plugin: BCPlugin, parsedSource: ParsedCodeblock) {
  const { dir, fields, type, title, depth, flat, content, from, implied } =
    parsedSource;
  const { userHiers } = plugin.settings;
  let err = "";

  if (!CODEBLOCK_TYPES.includes(type))
    err += `<code>type: ${type}</code> is not a valid type. It must be one of: ${CODEBLOCK_TYPES.map(
      (type) => `<code>${type}</code>`
    ).join(", ")}.</br>`;

  const validDir = DIRECTIONS.includes(dir);
  if (!validDir)
    err += `<code>dir: ${dir}</code> is not a valid direction.</br>`;

  const allFields = getFields(userHiers);
  [fields].flat()?.forEach((f) => {
    if (f !== undefined && !allFields.includes(f))
      err += `<code>fields: ${f}</code> is not a field in your hierarchies.</br>`;
  });

  if (title !== undefined && title !== "false")
    err += `<code>title: ${title}</code> is not a valid value. It has to be <code>false</code>, or leave the entire line out.</br>`;

  if (depth !== undefined && depth.every((num) => isNaN(parseInt(num))))
    err += `<code>depth: ${depth}</code> is not a valid value. It has to be a number.</br>`;

  if (flat !== undefined && flat !== "true")
    err += `<code>flat: ${flat}</code> is not a valid value. It has to be <code>true</code>, or leave the entire line out.</br>`;

  if (content !== undefined && content !== "open" && content !== "closed")
    err += `<code>content: ${content}</code> is not a valid value. It has to be <code>open</code> or <code>closed</code>, or leave the entire line out.</br>`;

  if (
    from !== undefined &&
    !plugin.app.plugins.enabledPlugins.has("dataview")
  ) {
    err += `Dataview must be enabled to use <code>from</code>.</br>`;
  }

  if (implied !== undefined && implied !== "false")
    err += `<code>implied: ${implied}</code> is not a valid value. It has to be <code>false</code>, or leave the entire line out.</br>`;

  return err === ""
    ? ""
    : `${err}</br>
    A valid example would be:
    <pre><code>
      type: tree
      dir: ${validDir ? dir : "down"}
      fields: ${
        allFields
          .map((f) => {
            return { f, dir: getFieldInfo(userHiers, f).fieldDir };
          })
          .filter((info) => info.dir === dir)
          .map((info) => info.f)
          .join(", ") || "child"
      }
      depth: 3
      </code></pre>`;
}

const STORE_ID = "core";

function indentToDepth(indent: string) {
  return indent.length / 2 + 1;
}

function meetsConditions(
  indent: string,
  node: string,
  froms: string[],
  min: number,
  max: number
) {
  const depth = indentToDepth(indent);
  return (
    depth >= min &&
    depth <= max &&
    (froms === undefined || froms.includes(node))
  );
}

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
      console.log({ node });
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

function createJuggl(
  plugin: BCPlugin,
  target: HTMLElement,
  initialNodes: string[],
  args: IJugglSettings
) {
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
    juggl.load();
    console.log({ juggl });
  } catch (error) {
    console.log({ error });
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
  createJuggl(plugin, target, nodes, args);
}

export function createdJugglCB(
  plugin: BCPlugin,
  target: HTMLElement,
  args: ParsedCodeblock,
  lines: [string, string][],
  froms: string[],
  source: string,
  min: number,
  max: number
) {
  const nodes = lines
    .filter(([indent, node]) => meetsConditions(indent, node, froms, min, max))
    .map(([_, node]) => node + ".md");
  if (min <= 0) {
    nodes.push(source + ".md");
  }
  console.log({ lines, nodes });
  createJuggl(plugin, target, nodes, args);
}
