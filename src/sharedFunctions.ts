import Graph from "graphology";
import type Attributes from 'graphology'
import { parseTypedLink } from "juggl-api";
import {
  App,
  FrontMatterCache,
  Notice,
  Pos,
  TFile,
  WorkspaceLeaf,
} from "obsidian";
import { DIRECTIONS, dropHeaderOrAlias, splitLinksRegex } from "src/constants";
import type {
  BCIndex,
  BCSettings,
  Directions,
  dvFrontmatterCache,
  dvLink,
  HierarchyFields,
  HierarchyGraphs,
  JugglLink,
  userHierarchy,
} from "src/interfaces";
import type BCPlugin from "src/main";
import type MatrixView from "src/MatrixView";
import util from "util";

export function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b);
}

export function normalise(arr: number[]): number[] {
  const max = Math.max(...arr);
  return arr.map((item) => item / max);
}

export const isSubset = <T>(arr1: T[], arr2: T[]): boolean =>
  arr1.every((value) => arr2.includes(value));

export function debug(settings: BCSettings, log: any): void {
  if (settings.debugMode) {
    console.log(log);
  }
}

export function superDebug(settings: BCSettings, log: any): void {
  if (settings.superDebugMode) {
    console.log(log);
  }
}

export function debugGroupStart(
  settings: BCSettings,
  type: "debugMode" | "superDebugMode",
  group: string
) {
  if (settings[type]) {
    console.groupCollapsed(group);
  }
}
export function debugGroupEnd(
  settings: BCSettings,
  type: "debugMode" | "superDebugMode"
) {
  if (settings[type]) {
    console.groupEnd();
  }
}

export function getDVMetadataCache(
  app: App,
  settings: BCSettings,
  files: TFile[]
) {
  debugGroupStart(settings, "debugMode", "getDVMetadataCache");
  debug(settings, "Using Dataview");
  debugGroupStart(settings, "superDebugMode", "dvCaches");

  const fileFrontmatterArr: dvFrontmatterCache[] = [];
  files.forEach((file) => {
    superDebug(settings, `GetDVMetadataCache: ${file.basename}`);

    const dvCache: dvFrontmatterCache = app.plugins.plugins.dataview.api.page(
      file.path
    );

    superDebug(settings, { dvCache });
    fileFrontmatterArr.push(dvCache);
  });

  debugGroupEnd(settings, "superDebugMode");
  debug(settings, { fileFrontmatterArr });
  debugGroupEnd(settings, "debugMode");
  return fileFrontmatterArr;
}

export function getObsMetadataCache(
  app: App,
  settings: BCSettings,
  files: TFile[]
) {
  debugGroupStart(settings, "debugMode", "getObsMetadataCache");
  debug(settings, "Using Obsidian");
  debugGroupStart(settings, "superDebugMode", "obsCaches");

  const fileFrontmatterArr: dvFrontmatterCache[] = [];
  files.forEach((file) => {
    superDebug(settings, `GetObsMetadataCache: ${file.basename}`);
    const obs: FrontMatterCache =
      app.metadataCache.getFileCache(file)?.frontmatter;
    superDebug(settings, { obs });
    if (obs) {
      fileFrontmatterArr.push({ file, ...obs });
    } else {
      fileFrontmatterArr.push({ file });
    }
  });

  debugGroupEnd(settings, "superDebugMode");
  debug(settings, { fileFrontmatterArr });
  debugGroupEnd(settings, "debugMode");
  return fileFrontmatterArr;
}

export function splitAndDrop(str: string): string[] | [] {
  return (
    str
      ?.match(splitLinksRegex)
      ?.map((link) => link.match(dropHeaderOrAlias)?.[1]) ?? []
  );
}

// TODO I think it'd be better to do this whole thing as an obj instead of JugglLink[]
// => {[note: string]: {type: string, linksInLine: string[]}[]}
export async function getJugglLinks(
  app: App,
  settings: BCSettings
): Promise<JugglLink[]> {
  debugGroupStart(settings, "debugMode", "getJugglLinks");
  debug(settings, "Using Juggl");

  const files = app.vault.getMarkdownFiles();
  const { userHierarchies } = settings;

  // Add Juggl links
  const typedLinksArr: JugglLink[] = await Promise.all(
    files.map(async (file) => {
      const jugglLink: JugglLink = { note: file.basename, links: [] };

      // Use Obs metadatacache to get the links in the current file
      const links = app.metadataCache.getFileCache(file)?.links ?? [];
      // TODO Only get cachedRead if links.length
      const content = await app.vault.cachedRead(file);

      links.forEach((link) => {
        // Get the line no. of each link
        const lineNo = link.position.start.line;
        // And the corresponding line content
        const line = content.split("\n")[lineNo];

        // Get an array of inner text of each link
        const linksInLine =
          line
            .match(splitLinksRegex)
            ?.map((link) => link.slice(2, link.length - 2))
            ?.map((innerText) => innerText.split("|")[0]) ?? [];

        const typedLinkPrefix =
          app.plugins.plugins.juggl?.settings.typedLinkPrefix ?? "-";

        const parsedLinks = parseTypedLink(link, line, typedLinkPrefix);

        const type = parsedLinks?.properties?.type ?? "";
        let typeDir: Directions | "" = "";
        DIRECTIONS.forEach((dir) => {
          userHierarchies.forEach((hier) => {
            if (hier[dir].includes(type)) {
              typeDir = dir;
              return;
            }
          });
        });

        jugglLink.links.push({
          dir: typeDir,
          type,
          linksInLine,
        });
      });
      return jugglLink;
    })
  );

  debug(settings, { typedLinksArr });

  const allFields: string[] = settings.userHierarchies
    .map((hier) => Object.values(hier))
    .flat(2)
    .filter((field: string) => field !== "");

  typedLinksArr.forEach((jugglLink) => {
    // Filter out links whose type is not in allFields

    const fieldTypesOnly = jugglLink.links.filter((link) =>
      allFields.includes(link.type)
    );

    // // const fieldTypesOnly = [];
    // jugglLink.links.forEach((link) => {
    //   if (allFields.includes(link.type)) {
    //     fieldTypesOnly.push(link);
    //   }
    // });
    // I don't remember why I'm mutating the links instead of making a new obj
    jugglLink.links = fieldTypesOnly;
  });

  // Filter out the juggl links with no links
  const filteredLinks = typedLinksArr.filter(
    (jugglLink) => jugglLink.links.length
  );
  debug(settings, { filteredLinks });
  debugGroupEnd(settings, "debugMode");
  return filteredLinks;
}

export function getFieldValues(
  frontmatterCache: dvFrontmatterCache,
  field: string,
  settings: BCSettings
) {
  const values: string[] = [];
  try {
    const rawValuesPreFlat = frontmatterCache?.[field];
    if (!rawValuesPreFlat) return [];
    if (typeof rawValuesPreFlat === "string") {
      const splits = rawValuesPreFlat.match(splitLinksRegex);
      if (splits !== null) {
        const strs = splits.map((link) =>
          link.match(dropHeaderOrAlias)[1].split("/").last()
        );
        values.push(...strs);
      }
      // else {
      //    Dont't add anything, it's not a link
      // }
    } else {
      type RawValue = string | number | dvLink | Pos | TFile | undefined;
      const rawValues: (RawValue | typeof Proxy)[] = [rawValuesPreFlat].flat(4);

      superDebug(settings, `${field} of: ${frontmatterCache?.file?.path}`);
      superDebug(settings, rawValues);

      rawValues.forEach((rawItem) => {
        if (!rawItem) return;

        let unProxied = [rawItem];
        if (util.types.isProxy(rawItem)) {
          unProxied = [];

          // Definitely a proxy the first time
          const first = Object.assign({}, rawItem);
          first.values.forEach((firstVal: RawValue | typeof Proxy) => {
            if (util.types.isProxy(firstVal)) {
              const second = Object.assign({}, firstVal);
              const secondValues = second.values;
              if (secondValues) {
                secondValues.forEach((secondVal: RawValue | typeof Proxy) => {
                  if (util.types.isProxy(secondVal)) {
                    const third = Object.assign({}, secondVal).values;
                    third.forEach((thirdVal: RawValue | typeof Proxy) => {
                      unProxied.push(thirdVal);
                    });
                  } else {
                    unProxied.push(secondVal);
                  }
                });
              } else {
                unProxied.push(second);
              }
            } else {
              unProxied.push(firstVal);
            }
          });
        }
        unProxied.forEach((value) => {
          if (typeof value === "string" || typeof value === "number") {
            // Obs cache converts link of form: [[\d+]] to number[][]
            const rawItemAsString = value.toString();
            const splits = rawItemAsString.match(splitLinksRegex);
            if (splits !== null) {
              const strs = splits.map((link) =>
                link.match(dropHeaderOrAlias)[1].split("/").last()
              );
              values.push(...strs);
            } else {
              values.push(rawItemAsString.split("/").last());
            }
          } else if (value.path !== undefined) {
            const lastSplit = value.path.split("/").last();
            if (lastSplit !== undefined) {
              values.push(lastSplit);
            }
          }
        });
      });
    }
    return values;
  } catch (error) {
    console.log(error);
    return values;
  }
}

export const splitAndTrim = (fields: string): string[] =>
  fields.split(",").map((str: string) => str.trim());

/**
 *
 * @param  {BCPlugin} plugin
 * @param  {dvFrontmatterCache[]} fileFrontmatterArr
 * @returns HierarchyFields
 */
export async function getNeighbourObjArr(
  plugin: BCPlugin,
  fileFrontmatterArr: dvFrontmatterCache[]
): Promise<
  {
    current: TFile;
    hierarchies: HierarchyFields[];
  }[]
> {
  const { settings } = plugin;
  const { userHierarchies } = settings;

  if (settings.debugMode || settings.superDebugMode) {
    console.groupCollapsed("getNeighbourObjArr");
  }

  let jugglLinks: JugglLink[] = [];
  if (
    plugin.app.plugins.plugins.juggl !== undefined ||
    plugin.settings.parseJugglLinksWithoutJuggl
  ) {
    jugglLinks = await getJugglLinks(plugin.app, plugin.settings);
  }

  const neighbourObjArr: {
    current: TFile;
    hierarchies: HierarchyFields[];
  }[] = fileFrontmatterArr.map((fileFrontmatter) => {
    const currFileName =
      fileFrontmatter.file.basename || fileFrontmatter.file.name;
    const hierFields: {
      current: TFile;
      hierarchies: HierarchyFields[];
    } = {
      current: fileFrontmatter.file,
      hierarchies: [],
    };

    userHierarchies.forEach((hier, i) => {
      const fieldsArr = Object.values(hier) as [string[], string[], string[]];
      const newHier: HierarchyFields = { up: {}, same: {}, down: {} };

      // Add regular metadata links
      if (settings.useAllMetadata) {
        DIRECTIONS.forEach((dir, i) => {
          fieldsArr[i].forEach((field) => {
            newHier[dir][field] = getFieldValues(
              fileFrontmatter,
              field,
              settings
            );
          });
        });
      }

      // Add Juggl Links
      if (jugglLinks.length) {
        const jugglLinksInFile = jugglLinks.filter((jugglLink) => {
          return jugglLink.note === currFileName;
        })[0];

        if (jugglLinksInFile) {
          jugglLinksInFile.links.forEach((line) => {
            if ((hier[line.dir] as string[]).includes(line.type)) {
              newHier[line.dir][line.type] = [
                ...new Set([
                  ...(newHier[line.dir][line.type] ?? []),
                  ...line.linksInLine,
                ]),
              ];
            }
          });
        }
      }

      hierFields.hierarchies.push(newHier);
    });

    return hierFields;
  });

  debug(settings, { neighbourObjArr });
  if (settings.debugMode || settings.superDebugMode) {
    console.groupEnd();
  }
  return neighbourObjArr;
}

// This function takes the real & implied graphs for a given relation, and returns a new graphs with both.
// It makes implied relations real
export function closeImpliedLinks(real: Graph, implied: Graph): Graph {
  const closedG = real.copy();
  implied.forEachEdge((key, a, s, t) => {
    closedG.mergeEdge(t, s, a);
  });
  return closedG;
}

export const isInVault = (app: App, note: string): boolean =>
  !!app.metadataCache.getFirstLinkpathDest(
    note,
    app.workspace.getActiveFile().path
  );

export function hoverPreview(
  event: MouseEvent,
  matrixView: MatrixView,
  to: string
): void {
  const targetEl = event.target as HTMLElement;

  matrixView.app.workspace.trigger("hover-link", {
    event,
    source: matrixView.getViewType(),
    hoverParent: matrixView,
    targetEl,
    linktext: to,
  });
}

export async function openOrSwitch(
  app: App,
  dest: string,
  currFile: TFile,
  event: MouseEvent
): Promise<void> {
  const { workspace } = app;
  let destFile = app.metadataCache.getFirstLinkpathDest(dest, currFile.path);

  // If dest doesn't exist, make it
  if (!destFile) {
    const newFileFolder = app.fileManager.getNewFileParent(currFile.path).path;
    const newFilePath = `${newFileFolder}${newFileFolder === "/" ? "" : "/"
      }${dest}.md`;
    await app.vault.create(newFilePath, "");
    destFile = app.metadataCache.getFirstLinkpathDest(
      newFilePath,
      currFile.path
    );
  }

  // Check if it's already open
  const leavesWithDestAlreadyOpen: WorkspaceLeaf[] = [];
  // For all open leaves, if the leave's basename is equal to the link destination, rather activate that leaf instead of opening it in two panes
  workspace.iterateAllLeaves((leaf) => {
    //@ts-ignore
    if (leaf.view?.file?.basename === dest) {
      leavesWithDestAlreadyOpen.push(leaf);
    }
  });

  // Rather switch to it if it is open
  if (leavesWithDestAlreadyOpen.length > 0) {
    workspace.setActiveLeaf(leavesWithDestAlreadyOpen[0]);
  } else {
    const mode = (app.vault as any).getConfig("defaultViewMode");
    const leaf =
      event.ctrlKey || event.getModifierState("Meta")
        ? workspace.splitActiveLeaf()
        : workspace.getUnpinnedLeaf();

    await leaf.openFile(destFile, { active: true, mode });
  }
}

export function padArray(arr: any[], finalLength: number, filler = ""): any[] {
  const copy = [...arr];
  const currLength = copy.length;
  if (currLength > finalLength) {
    throw new Error("Current length is greater than final length");
  } else if (currLength === finalLength) {
    return copy;
  } else {
    for (let i = currLength; i < finalLength; i++) {
      copy.push(filler);
    }
    return copy;
  }
}

export function transpose(A: any[][]): any[][] {
  const cols = A[0].length;
  const AT: any[][] = [];
  // For each column
  for (let j = 0; j < cols; j++) {
    // Add a new row to AT
    AT.push([]);
    // And fill it with the values in the jth column of A
    A.forEach((row) => AT[j].push(row[j]));
  }
  return AT;
}

export function runs(
  arr: string[]
): { value: string; first: number; last: number }[] {
  const runs: { value: string; first: number; last: number }[] = [];
  let i = 0;
  while (i < arr.length) {
    const currValue = arr[i];
    runs.push({ value: currValue, first: i, last: undefined });
    while (currValue === arr[i]) {
      i++;
    }
    runs.last().last = i - 1;
  }
  return runs;
}

// SOURCE https://stackoverflow.com/questions/9960908/permutations-in-javascript
export function permute(permutation: any[]): any[][] {
  const length = permutation.length,
    result = [permutation.slice()],
    c = new Array(length).fill(0);

  let i = 1,
    k: number,
    p: number;

  while (i < length) {
    if (c[i] < i) {
      k = i % 2 && c[i];
      p = permutation[i];
      permutation[i] = permutation[k];
      permutation[k] = p;
      ++c[i];
      i = 1;
      result.push(permutation.slice());
    } else {
      c[i] = 0;
      ++i;
    }
  }
  return result;
}

export function dropMD(path: string) {
  return path.split(".md", 1)[0];
}

export const range = (n: number) => [...Array(5).keys()];

export function complement<T>(A: T[], B: T[]) {
  return A.filter((a) => !B.includes(a));
}

export async function copy(content: string) {
  await navigator.clipboard.writeText(content).then(
    () => new Notice("Copied to clipboard"),
    () => new Notice("Could not copy to clipboard")
  );
}

export function makeWiki(wikiQ: boolean, str: string) {
  let copy = str.slice();
  if (wikiQ) {
    copy = "[[" + copy;
    copy += "]]";
  }
  return copy;
}

export function mergeGs(...graphs: Graph[]) {
  const outG = new Graph();

  graphs.forEach((g) => {
    g.forEachNode((node, a) => {
      outG.mergeNode(node, a);
    });
    g.forEachEdge((key, a, s, t) => {
      outG.mergeEdge(s, t, a);
    });
  });
  return outG;
}

export function removeUnlinkedNodes(g: Graph) {
  const copy = g.copy();
  copy.forEachNode((node) => {
    if (!copy.neighbors(node).length) copy.dropNode(node);
  });
  return copy;
}

export function getAllGsInDir(currGraphs: HierarchyGraphs[], dir: Directions) {
  const target = {};
  const allGsInDir: { [field: string]: Graph } = Object.assign(
    target,
    ...currGraphs.map((hierGs) => hierGs[dir])
  );
  return allGsInDir;
}

export function iterateAllGs(
  currGraphs: HierarchyGraphs[],
  cb: (g: Graph, dir: Directions, fieldName: string) => any
) {
  for (const hierGs of currGraphs) {
    for (const dir of DIRECTIONS) {
      for (const fieldName in hierGs[dir]) {
        const g = hierGs[dir][fieldName];
        cb(g, dir, fieldName);
      }
    }
  }
}

export function getAllFieldGs(fields: string[], currGraphs: HierarchyGraphs[]) {
  const fieldGs: Graph[] = [];
  iterateAllGs(currGraphs, (g, dir, fieldName) => {
    if (fields.includes(fieldName)) fieldGs.push(g);
  });
  return fieldGs;
}

export function hierToStr(hier: userHierarchy) {
  return `↑: ${hier.up.join(", ")}
→: ${hier.same.join(", ")}
↓: ${hier.down.join(", ")}`;
}

export function removeDuplicates<T>(arr: T[]) {
  return [...new Set(arr)];
}

/**
 * Adds or updates the given yaml `key` to `value` in the given TFile
 * @param  {string} key
 * @param  {string} value
 * @param  {TFile} file
 * @param  {FrontMatterCache|undefined} frontmatter
 * @param  {{[fun:string]:(...args:any} api
 */
export const createOrUpdateYaml = async (
  key: string,
  value: string,
  file: TFile,
  frontmatter: FrontMatterCache | undefined,
  api: { [fun: string]: (...args: any) => any }
) => {
  const valueStr = value.toString();

  if (!frontmatter || frontmatter[key] === undefined) {
    console.log(`Creating: ${key}: ${valueStr}`);
    await api.createYamlProperty(key, `['${valueStr}']`, file);
  } else if ([...[frontmatter[key]]].flat(3).some((val) => val == valueStr)) {
    console.log("Already Exists!");
    return;
  } else {
    const oldValueFlat: string[] = [...[frontmatter[key]]].flat(4);
    const newValue = [...oldValueFlat, valueStr].map((val) => `'${val}'`);
    console.log(`Updating: ${key}: ${newValue}`);
    await api.update(key, `[${newValue.join(", ")}]`, file);
  }
};

export const getOppDir = (dir: Directions): Directions =>
  dir === "same" ? "same" : dir === "up" ? "down" : "up";

export const writeBCToFile = (
  app: App,
  plugin: BCPlugin,
  currGraphs: BCIndex,
  file: TFile
) => {
  const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
  const api = app.plugins.plugins.metaedit?.api;

  if (!api) {
    new Notice("Metaedit must be enabled for this function to work");
    return;
  }

  iterateAllGs(currGraphs.hierGs, (fieldG, dir, fieldName) => {
    const oppDir = getOppDir(dir);
    const succs = getInNeighbours(fieldG, file.basename);

    succs.forEach(async (succ) => {
      const { fieldName } = fieldG.getNodeAttributes(succ);
      if (!plugin.settings.limitWriteBCCheckboxStates[fieldName]) return;

      const currHier = plugin.settings.userHierarchies.find((hier) =>
        hier[dir].includes(fieldName)
      );
      let oppField: string = currHier[oppDir][0];
      if (!oppField) oppField = `<Reverse>${fieldName}`;

      await createOrUpdateYaml(oppField, succ, file, frontmatter, api);
    });
  });
};

export function oppFields(
  field: string,
  dir: Directions,
  userHierarchies: userHierarchy[]
): string[] {
  const oppDir = getOppDir(dir);
  return (
    userHierarchies.find((hier) => hier[oppDir].includes(field))?.[oppDir] ?? []
  );
}

export function addNodeIfNot(g: Graph, node: string, attr?: Attributes) {
  if (!g.hasNode(node)) g.addNode(node, attr);
}

export function addEdgeIfNot(
  g: Graph,
  source: string,
  target: string,
  attr?: Attributes
) {
  if (!g.hasEdge(source, target)) g.addEdge(source, target, attr);
}

export const getSinks = (g: Graph) =>
  g.filterNodes((node) => !getOutNeighbours(g, node).length);

export const getSources = (g: Graph) =>
  g.filterNodes((node) => !getInNeighbours(g, node).length);

export function swapItems<T>(i: number, j: number, arr: T[]) {
  const max = arr.length - 1;
  if (i < 0 || i > max || j < 0 || j > max) return arr;
  const tmp = arr[i];
  arr[i] = arr[j];
  arr[j] = tmp;
  return arr;
}

export const linkClass = (app: App, to: string, realQ = true) => `internal-link BC-Link ${isInVault(app, to) ? "" : "is-unresolved"} ${realQ ? "" : "BC-Implied"
  }`;


export const getOutNeighbours = (g: Graph, node: string): string[] => g.hasNode(node) ? g.outNeighbors(node) : []
export const getInNeighbours = (g: Graph, node: string): string[] => g.hasNode(node) ? g.inNeighbors(node) : []