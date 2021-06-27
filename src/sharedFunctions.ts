import type { App, FrontMatterCache, TFile } from "obsidian";
import { dropHeaderOrAlias, splitLinksRegex } from "src/constants";
import type { fileFrontmatter, neighbourObj } from "src/interfaces";
import type BreadcrumbsPlugin from "src/main";

export function getFileFrontmatterArr(app: App): fileFrontmatter[] {
  const files: TFile[] = app.vault.getMarkdownFiles();
  const fileFrontMatterArr: fileFrontmatter[] = [];

  // If dataview is **enabled** (not just installed), use its index
  if (app.plugins.plugins.dataview !== undefined) {
    app.workspace.onLayoutReady(() => {
      files.forEach((file) => {
        const dv: FrontMatterCache = app.plugins.plugins.dataview.api.page(
          file.path
        );
        fileFrontMatterArr.push({ file, frontmatter: dv });
      });
    });
  }
  // Otherwise use Obsidian's
  else {
    files.forEach((file) => {
      const obs: FrontMatterCache =
        app.metadataCache.getFileCache(file).frontmatter ?? [];
      fileFrontMatterArr.push({
        file,
        frontmatter: obs,
      });
    });
  }
  return fileFrontMatterArr;
}

export function splitAndDrop(str: string): string[] | [] {
  return str
    ?.match(splitLinksRegex)
    ?.map((link) => link.match(dropHeaderOrAlias)?.[1]);
}

export function getFields(
  fileFrontmatter: fileFrontmatter,
  field: string
): string[] {
  const fieldItems: string | [] = fileFrontmatter.frontmatter[field] ?? [];
  if (typeof fieldItems === "string") {
    return splitAndDrop(fieldItems).map((value) => value.split("/").last());
  } else {
    const links = [fieldItems]
      .flat()
      .map((link) => link.path.split("/").last() ?? link.split("/").last());
    return links;
  }
}

export const splitAndTrim = (fields: string): string[] =>
  fields.split(",").map((str: string) => str.trim());

export function getNeighbourObjArr(
  plugin: BreadcrumbsPlugin,
  fileFrontmatterArr: fileFrontmatter[]
): neighbourObj[] {
  const { parentFieldName, siblingFieldName, childFieldName } = plugin.settings;

  const [parentFields, siblingFields, childFields] = [
    splitAndTrim(parentFieldName),
    splitAndTrim(siblingFieldName),
    splitAndTrim(childFieldName),
  ];

  const neighbourObjArr: neighbourObj[] = fileFrontmatterArr.map(
    (fileFrontmatter) => {
      const [parents, siblings, children] = [
        parentFields
          .map((parentField) => getFields(fileFrontmatter, parentField))
          .flat(),
        siblingFields
          .map((siblingField) => getFields(fileFrontmatter, siblingField))
          .flat(),
        childFields
          .map((childField) => getFields(fileFrontmatter, childField))
          .flat(),
      ];
      return { current: fileFrontmatter.file, parents, siblings, children };
    }
  );
  return neighbourObjArr;
}

// This doesn't work for some reason. Even if you pass it `app`, metadatacache is undefined
// export function resolvedClass(
//   app: App,
//   toFile: string,
//   currFile: TFile
// ):
//   | "internal-link is-unresolved breadcrumbs-link"
//   | "internal-link breadcrumbs-link" {
//   return app.metadataCache.unresolvedLinks[currFile.path][toFile] > 0
//     ? "internal-link is-unresolved breadcrumbs-link"
//     : "internal-link breadcrumbs-link";
// }
