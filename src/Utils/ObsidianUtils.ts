import type { FrontMatterCache, TFile } from "obsidian";
import type { MetaeditApi } from "../interfaces";
import type BCPlugin from "../main";
import { splitAndTrim } from "./generalUtils";

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
export const getFolderName = (file: TFile): string =>
  //@ts-ignore
  file?.parent?.name || file.folder;

export function makeWiki(str: string, wikiQ = true) {
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

export const dropHash = (tag: string) =>
  tag.startsWith("#") ? tag.slice(1) : tag;

export const addHash = (tag: string) => (tag.startsWith("#") ? tag : `#${tag}`);

export function getAlt(node: string, plugin: BCPlugin): string | null {
  const { app } = plugin;
  const { altLinkFields, showAllAliases } = plugin.settings;
  if (altLinkFields.length) {
    const file = app.metadataCache.getFirstLinkpathDest(node, "");
    if (file) {
      const metadata = app.metadataCache.getFileCache(file);
      for (const altField of altLinkFields) {
        const value = metadata?.frontmatter?.[altField];

        const arr: string[] =
          typeof value === "string" ? splitAndTrim(value) : value;
        if (value) return showAllAliases ? arr.join(", ") : arr[0];
      }
    }
  } else return null;
}
