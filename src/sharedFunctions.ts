import type { App, FrontMatterCache, TFile } from "obsidian";
import { isInVault } from "obsidian-community-lib";
import {
  ARROW_DIRECTIONS,
  blankRealNImplied,
  DIRECTIONS,
  dropHeaderOrAlias,
  splitLinksRegex,
} from "./constants";
import { getOppDir, getOppFields } from "./graphUtils";
import type {
  Directions,
  MetaeditApi,
  RealNImplied,
  UserHier,
} from "./interfaces";
import type BCPlugin from "./main";

export function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b);
}

export function normalise(arr: number[]): number[] {
  const max = Math.max(...arr);
  return arr.map((item) => item / max);
}

export const isSubset = <T>(arr1: T[], arr2: T[]): boolean =>
  arr1.every((value) => arr2.includes(value));

export function splitAndDrop(str: string): string[] {
  return (
    str
      ?.match(splitLinksRegex)
      ?.map((link) => link.match(dropHeaderOrAlias)?.[1]) ?? []
  );
}

/**
 * Get basename from a **Markdown** `path`
 * @param  {string} path
 */
export const getBaseFromMDPath = (path: string) => {
  const splitSlash = path.split("/").last();
  if (splitSlash.endsWith(".md")) {
    return splitSlash.split(".md").slice(0, -1).join(".");
  } else return splitSlash;
};

export const getDVBasename = (file: TFile) => file.basename || file.name;
export const getFolder = (file: TFile): string =>
  //@ts-ignore
  file?.parent?.name || file.folder;

export const splitAndTrim = (fields: string): string[] => {
  if (fields === "") return [];
  else return fields.split(",").map((str) => str.trim());
};

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

export const range = (n: number) => [...Array(n).keys()];

export function complement<T>(A: T[], B: T[]) {
  return A.filter((a) => !B.includes(a));
}

export function makeWiki(wikiQ: boolean, str: string) {
  let copy = str.slice();
  if (wikiQ) {
    copy = "[[" + copy;
    copy += "]]";
  }
  return copy;
}

export function dropWikilinks(str: string) {
  let copy = str.slice();
  if (copy.startsWith("[[") && copy.endsWith("]]")) copy = copy.slice(2, -2);
  return copy;
}

/**
 * Get all the fields in `dir`.
 * Returns all fields if `dir === 'all'`
 * @param  {UserHier[]} userHiers
 * @param  {Directions|"all"} dir
 */
export function getFields(
  userHiers: UserHier[],
  dir: Directions | "all" = "all"
) {
  const fields: string[] = [];
  userHiers.forEach((hier) => {
    if (dir === "all") {
      DIRECTIONS.forEach((eachDir) => {
        fields.push(...hier[eachDir]);
      });
    } else {
      fields.push(...hier[dir]);
    }
  });
  return fields;
}

export const hierToStr = (hier: UserHier) =>
  DIRECTIONS.map(
    (dir) => `${ARROW_DIRECTIONS[dir]}: ${hier[dir].join(", ")}`
  ).join("\n");

export function removeDuplicates<T>(arr: T[]) {
  return [...new Set(arr)];
}

/**
 * Adds or updates the given yaml `key` to `value` in the given TFile
 * @param  {string} key
 * @param  {string} value
 * @param  {TFile} file
 * @param  {FrontMatterCache|undefined} frontmatter
 * @param  {MetaeditApi} api
 */
export const createOrUpdateYaml = async (
  key: string,
  value: string,
  file: TFile,
  frontmatter: FrontMatterCache | undefined,
  api: MetaeditApi
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
    const newValue = [...oldValueFlat, `'${valueStr}'`];
    console.log(`Updating: ${key}: ${newValue}`);
    await api.update(key, `[${newValue.join(", ")}]`, file);
  }
};

export function splitAtYaml(content: string): [string, string] {
  const startsWithYaml = content.startsWith("---");
  if (!startsWithYaml) return ["", content];
  else {
    const splits = content.split("---");
    return [
      splits.slice(0, 2).join("---") + "---",
      splits.slice(2).join("---"),
    ];
  }
}

export function swapItems<T>(i: number, j: number, arr: T[]) {
  const max = arr.length - 1;
  if (i < 0 || i > max || j < 0 || j > max) return arr;
  const tmp = arr[i];
  arr[i] = arr[j];
  arr[j] = tmp;
  return arr;
}

export const linkClass = (app: App, to: string, realQ = true) =>
  `internal-link BC-Link ${isInVault(app, to) ? "" : "is-unresolved"} ${
    realQ ? "" : "BC-Implied"
  }`;

/** Remember to filter by hierarchy in MatrixView! */
export function getRealnImplied(
  plugin: BCPlugin,
  currNode: string,
  dir: Directions = null
): RealNImplied {
  const realsnImplieds: RealNImplied = blankRealNImplied();
  const { userHiers } = plugin.settings;

  plugin.mainG.forEachEdge(currNode, (k, a, s, t) => {
    const { field, dir: edgeDir } = a;
    const oppField = getOppFields(userHiers, field)[0];

    (dir ? [dir, getOppDir(dir)] : DIRECTIONS).forEach((currDir) => {
      const oppDir = getOppDir(currDir);
      // Reals
      if (s === currNode && (edgeDir === currDir || edgeDir === oppDir)) {
        const arr = realsnImplieds[edgeDir].reals;
        if (arr.findIndex((item) => item.to === t) === -1) {
          arr.push({ to: t, real: true, field });
        }
      }
      // Implieds
      // If `s !== currNode` then `t` must be
      else if (edgeDir === currDir || edgeDir === oppDir) {
        const arr = realsnImplieds[getOppDir(edgeDir)].implieds;
        if (arr.findIndex((item) => item.to === s) === -1) {
          arr.push({
            to: s,
            real: false,
            field: oppField,
          });
        }
      }
    });
  });
  return realsnImplieds;
}

export function iterateHiers(
  userHiers: UserHier[],
  fn: (hier: UserHier, dir: Directions, field: string) => void
) {
  userHiers.forEach((hier) => {
    DIRECTIONS.forEach((dir) => {
      hier[dir].forEach((field) => {
        fn(hier, dir, field);
      });
    });
  });
}
