import type { App } from "obsidian";
import { isInVault } from "obsidian-community-lib";
import { dropHeaderOrAlias, regNFlags, splitLinksRegex } from "../constants";
import type { BCSettings } from "../interfaces";

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

export const dropPath = (path: string) => path.replace(/^.*\//, "");
export const dropDendron = (path: string, settings: BCSettings) =>
  settings.trimDendronNotes
    ? path.split(settings.dendronNoteDelimiter).last()
    : path;

export const dropPathNDendron = (path: string, settings: BCSettings) =>
  dropDendron(dropPath(path), settings);

export const dropFolder = (path: string) =>
  path.split("/").last().split(".").slice(0, -1).join(".");

export const splitAndTrim = (fields: string): string[] => {
  if (!fields || fields === "") return [];
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

/**
 * Given an array of strings, return an array of objects that represent the runs of consecutive strings
 * in the array.
 * @param {string} arr
 * @returns An array of objects with the following properties:
 *
 *   `value`: the value of the run
 *
 *   `first`: the index of the first element in the run
 *
 *   `last`: the index of the last element in the run
 */
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
/**
 * Given a permutation, return all possible permutations of that permutation.
 * @param permutation - the array to be permuted
 * @returns `[ [ 1, 2, 3 ], [ 1, 3, 2 ], [ 2, 1, 3 ], [ 2, 3, 1 ], [ 3, 1, 2 ], [ 3, 2, 1 ] ]`
 */
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

export function removeDuplicates<T>(arr: T[]) {
  return [...new Set(arr)];
}

export function strToRegex(input: string) {
  const match = input.match(regNFlags);
  if (!match) return null;
  const [, innerRegex, flags] = match;
  try {
    const regex = new RegExp(innerRegex, flags);
    return regex;
  } catch (e) {
    console.log(e);
    return null;
  }
}
