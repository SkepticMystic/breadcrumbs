import type { Graph } from "graphlib";
import * as graphlib from "graphlib";
import { parseTypedLink } from "juggl-api";
import type {
  App,
  CachedMetadata,
  FrontMatterCache,
  TFile,
  WorkspaceLeaf,
} from "obsidian";
import { dropHeaderOrAlias, splitLinksRegex } from "src/constants";
import type {
  BreadcrumbsSettings,
  dvFrontmatterCache,
  dvLink,
  JugglLink,
  neighbourObj,
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

// export function flatten<T>(arr: T[]): T[] {
//   return [].concat(...arr)
// }

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

  const dvCacheArr: dvFrontmatterCache[] = [];
  files.forEach((file) => {
    superDebug(settings, `Get frontmatter: ${file.basename}`);

    const dvCache: dvFrontmatterCache = app.plugins.plugins.dataview.api.page(
      file.path
    );
    superDebug(settings, { dvCache });
    dvCacheArr.push(dvCache);
  });
  return dvCacheArr;
}

export function getObsMetadataCache(
  app: App,
  settings: BreadcrumbsSettings,
  files: TFile[]
) {
  debug(settings, "Using Obsidian");

  const fileFrontmatterArr: dvFrontmatterCache[] = [];

  files.forEach((file) => {
    const obs: FrontMatterCache =
      app.metadataCache.getFileCache(file).frontmatter;
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

export async function getJugglLinks(
  app: App,
  settings: BreadcrumbsSettings
): Promise<JugglLink[]> {
  const files = app.vault.getMarkdownFiles();
  // Add Juggl links
  const typedLinksArr: JugglLink[] = await Promise.all(
    files.map(async (file) => {
      const jugglLink: JugglLink = { note: file.basename, links: [] };

      const links = app.metadataCache.getFileCache(file)?.links ?? [];
      const content = await app.vault.cachedRead(file);

      links.forEach((link) => {
        const lineNo = link.position.start.line;
        const line = content.split("\n")[lineNo];

        const linksInLine =
          line
            .match(splitLinksRegex)
            ?.map((link) => link.slice(2, link.length - 2))
            ?.map((innerText) => innerText.split("|")[0]) ?? [];

        const parsedLinks = parseTypedLink(link, line, "-");
        jugglLink.links.push({
          type: parsedLinks?.properties?.type ?? "",
          linksInLine,
        });
      });
      return jugglLink;
    })
  );

  debug(settings, { typedLinksArr });

  const allFields: string[] = [
    settings.parentFieldName,
    settings.siblingFieldName,
    settings.childFieldName,
  ]
    .map(splitAndTrim)
    .flat()
    .filter((field: string) => field !== "");

  typedLinksArr.forEach((jugglLink) => {
    if (jugglLink.links.length) {
      const fieldTypesOnly = [];
      jugglLink.links.forEach((link) => {
        if (allFields.includes(link.type)) {
          fieldTypesOnly.push(link);
        }
      });
      jugglLink.links = fieldTypesOnly;
    }
  });

  const filteredLinks = typedLinksArr.filter((link) =>
    link.links.length ? true : false
  );
  debug(settings, { filteredLinks });
  return filteredLinks;
}

export function getFieldValues(
  frontmatterCache: dvFrontmatterCache,
  field: string
) {
  const rawValues: (string | dvLink)[] =
    [frontmatterCache?.[field]].flat(5) ?? null;

  if (rawValues.length && rawValues[0] !== undefined) {
    if (typeof rawValues[0] === "string") {
      return splitAndDrop(rawValues[0]).map((str: string) =>
        str.split("/").last()
      );
    } else {
      return (rawValues as dvLink[]).map((link: dvLink) =>
        link.path.split("/").last()
      );
    }
  } else {
    return [];
  }
}

export const splitAndTrim = (fields: string): string[] =>
  fields.split(",").map((str: string) => str.trim());

export async function getNeighbourObjArr(
  plugin: BreadcrumbsPlugin,
  fileFrontmatterArr: dvFrontmatterCache[]
): Promise<neighbourObj[]> {
  const { parentFieldName, siblingFieldName, childFieldName } = plugin.settings;

  const [parentFields, siblingFields, childFields] = [
    splitAndTrim(parentFieldName),
    splitAndTrim(siblingFieldName),
    splitAndTrim(childFieldName),
  ];

  let jugglLinks: JugglLink[];
  if (plugin.app.plugins.plugins.juggl !== undefined) {
    jugglLinks = await getJugglLinks(plugin.app, plugin.settings);
  }

  const neighbourObjArr: neighbourObj[] = fileFrontmatterArr.map(
    (fileFrontmatter) => {
      let [parents, siblings, children] = [
        parentFields
          .map((parentField) => getFieldValues(fileFrontmatter, parentField))
          .flat(3),
        siblingFields
          .map((siblingField) => getFieldValues(fileFrontmatter, siblingField))
          .flat(3),
        childFields
          .map((childField) => getFieldValues(fileFrontmatter, childField))
          .flat(3),
      ];

      if (plugin.app.plugins.plugins.juggl !== undefined) {
        const currFileJugglLinks = jugglLinks.filter(
          (link) => link.note === fileFrontmatter.file.basename
        );
        currFileJugglLinks.forEach((jugglLink) => {
          jugglLink.links.forEach((link) => {
            if (parentFields.includes(link.type)) {
              parents = [...parents, ...link.linksInLine];
            }
            if (siblingFields.includes(link.type)) {
              siblings = [...siblings, ...link.linksInLine];
            }
            if (childFields.includes(link.type)) {
              children = [...children, ...link.linksInLine];
            }
          });
        });
      }

      return { current: fileFrontmatter.file, parents, siblings, children };
    }
  );
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
  const currLength = arr.length;
  if (currLength > finalLength) {
    throw new Error("Current length is greater than final length");
  } else if (currLength === finalLength) {
    return arr;
  } else {
    for (let i = currLength; i < finalLength; i++) {
      arr.push(filler);
    }
    return arr;
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
