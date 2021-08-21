import * as graphlib from "graphlib";
import { Graph } from "graphlib";
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
  BreadcrumbsSettings,
  Directions,
  dvFrontmatterCache,
  dvLink,
  HierarchyFields,
  HierarchyGraphs,
  JugglLink,
  userHierarchy,
} from "src/interfaces";
import type BreadcrumbsPlugin from "src/main";
import type MatrixView from "src/MatrixView";

export function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b);
}

export function normalise(arr: number[]): number[] {
  const max = Math.max(...arr);
  return arr.map((item) => item / max);
}

export const isSubset = <T>(arr1: T[], arr2: T[]): boolean =>
  arr1.every((value) => arr2.includes(value));

export function debug(settings: BreadcrumbsSettings, log: any): void {
  if (settings.debugMode) {
    console.log(log);
  }
}

export function superDebug(settings: BreadcrumbsSettings, log: any): void {
  if (settings.superDebugMode) {
    console.log(log);
  }
}

export function getDVMetadataCache(
  app: App,
  settings: BreadcrumbsSettings,
  files: TFile[]
) {
  debug(settings, "Using Dataview");

  const fileFrontmatterArr: dvFrontmatterCache[] = [];
  files.forEach((file) => {
    superDebug(settings, `GetDVMetadataCache: ${file.basename}`);

    const dvCache: dvFrontmatterCache = app.plugins.plugins.dataview.api.page(
      file.path
    );

    superDebug(settings, { dvCache });
    fileFrontmatterArr.push(dvCache);
  });

  debug(settings, { fileFrontmatterArr });
  return fileFrontmatterArr;
}

export function getObsMetadataCache(
  app: App,
  settings: BreadcrumbsSettings,
  files: TFile[]
) {
  debug(settings, "Using Obsidian");

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

  debug(settings, { fileFrontmatterArr });
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
  settings: BreadcrumbsSettings
): Promise<JugglLink[]> {
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
  return filteredLinks;
}

export function getFieldValues(
  frontmatterCache: dvFrontmatterCache,
  field: string,
  settings: BreadcrumbsSettings
) {
  const values: string[] = [];
  try {
    const rawValuesPreFlat = frontmatterCache?.[field];
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
      const rawValues: (string | number | dvLink | Pos | TFile | undefined)[] =
        [rawValuesPreFlat].flat(4);

      superDebug(settings, `${field} of: ${frontmatterCache?.file?.path}`);
      superDebug(settings, { rawValues });

      rawValues.forEach((rawItem) => {
        if (!rawItem) return;
        if (typeof rawItem === "string" || typeof rawItem === "number") {
          // Obs cache converts link of form: [[\d+]] to number[][]
          const rawItemAsString = rawItem.toString();
          const splits = rawItemAsString.match(splitLinksRegex);
          if (splits !== null) {
            const strs = splits.map((link) =>
              link.match(dropHeaderOrAlias)[1].split("/").last()
            );
            values.push(...strs);
          } else {
            values.push(rawItemAsString.split("/").last());
          }
        } else if (rawItem.path) {
          values.push((rawItem as dvLink).path.split("/").last());
        }
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

export async function getNeighbourObjArr(
  plugin: BreadcrumbsPlugin,
  fileFrontmatterArr: dvFrontmatterCache[]
): Promise<
  {
    current: TFile;
    hierarchies: HierarchyFields[];
  }[]
> {
  const { userHierarchies } = plugin.settings;

  let jugglLinks: JugglLink[] = [];
  if (
    plugin.app.plugins.plugins.juggl !== undefined ||
    plugin.settings.parseJugglLinksWithoutJuggl
  ) {
    debug(plugin.settings, "Using Juggl");
    jugglLinks = await getJugglLinks(plugin.app, plugin.settings);
    debug(plugin.settings, { jugglLinks });
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
      if (plugin.settings.useAllMetadata) {
        DIRECTIONS.forEach((dir, i) => {
          fieldsArr[i].forEach((field) => {
            newHier[dir][field] = getFieldValues(
              fileFrontmatter,
              field,
              plugin.settings
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

  debug(plugin.settings, { neighbourObjArr });
  return neighbourObjArr;
}

// This function takes the real & implied graphs for a given relation, and returns a new graphs with both.
// It makes implied relations real
export function closeImpliedLinks(real: Graph, implied: Graph): Graph {
  const closedG = graphlib.json.read(graphlib.json.write(real));
  implied.edges().forEach((impliedEdge) => {
    closedG.setEdge(impliedEdge.w, impliedEdge.v);
  });
  return closedG;
}

export const isInVault = (app: App, note: string): boolean =>
  !!app.metadataCache.getFirstLinkpathDest(
    note,
    app.workspace.getActiveFile().path
  );

export function hoverPreview(event: MouseEvent, matrixView: MatrixView): void {
  const targetEl = event.target as HTMLElement;

  matrixView.app.workspace.trigger("hover-link", {
    event,
    source: matrixView.getViewType(),
    hoverParent: matrixView,
    targetEl,
    linktext: targetEl.innerText,
  });
}

export async function openOrSwitch(
  app: App,
  dest: string,
  currFile: TFile,
  event: MouseEvent
): Promise<void> {
  const { workspace } = app;
  const destFile = app.metadataCache.getFirstLinkpathDest(dest, currFile.path);

  const openLeaves: WorkspaceLeaf[] = [];
  // For all open leaves, if the leave's basename is equal to the link destination, rather activate that leaf instead of opening it in two panes
  workspace.iterateAllLeaves((leaf) => {
    if (leaf.view?.file?.basename === dest) {
      openLeaves.push(leaf);
    }
  });

  if (openLeaves.length > 0) {
    workspace.setActiveLeaf(openLeaves[0]);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mode = (app.vault as any).getConfig("defaultViewMode");
    const leaf = event.ctrlKey
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

export function mergeGraphs(g1: Graph, g2: Graph) {
  const copy1 = graphlib.json.read(graphlib.json.write(g1));
  g2.edges().forEach((edge) => {
    copy1.setEdge(edge.v, edge.w);
  });
  return copy1;
}

export function mergeGs(...graphs: Graph[]) {
  const outG = new Graph();
  graphs.forEach((graph) => {
    graph.edges().forEach((edge) => {
      const nodeLabel = graph.node(edge.v);
      outG.setNode(edge.v, nodeLabel);
      const edgeLabel = graph.edge(edge);
      outG.setEdge(edge, edgeLabel);
    });
  });
  return outG;
}

export function removeUnlinkedNodes(g: Graph) {
  const copy = graphlib.json.read(graphlib.json.write(g));
  const nodes = copy.nodes();
  const unlinkedNodes = nodes.filter(
    (node) => !(copy.neighbors(node) as string[]).length
  );
  unlinkedNodes.forEach((node) => copy.removeNode(node));
  return copy;
}

export function getAllGsInDir(
  userHierarchies: userHierarchy[],
  currGraphs: HierarchyGraphs[],
  dir: Directions
) {
  const target = {};
  const allGsInDir: { [field: string]: Graph } = Object.assign(
    target,
    ...currGraphs.map((hierGs) => hierGs[dir])
  );

  // const fieldNamesInXDir = userHierarchies
  //   .map((hier) => hier[dir])
  //   .filter((field) => field.join() !== "")
  //   .flat();

  // const allXGs: { [rel: string]: Graph } = {};

  // currGraphs.forEach((hierarchyGs) => {
  //   fieldNamesInXDir.forEach((field) => {
  //     const graph = hierarchyGs[dir][field];
  //     if (graph) {
  //       allXGs[field] = graph;
  //     }
  //   });
  // });
  // console.log({ allXGs, allGsInDir });
  return allGsInDir;
}

export function hierToStr(hier: userHierarchy) {
  return `↑: ${hier.up.join(", ")}
→: ${hier.same.join(", ")}
↓: ${hier.down.join(", ")}`;
}

export function removeDuplicates<T>(arr: T[]) {
  return [...new Set(arr)];
}
