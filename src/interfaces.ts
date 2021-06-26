import type { App, FrontMatterCache, TFile } from "obsidian";

export interface neighbourObj {
  current: TFile;
  parents: string[];
  siblings: string[];
  children: string[];
}

export interface ParentObj {
  current: TFile;
  parents: string[];
}

export interface fileFrontmatter {
  file: TFile;
  frontmatter: FrontMatterCache;
}

export interface internalLinkObj {
  to: string;
  currFile: TFile;
  cls:
    | "internal-link is-unresolved breadcrumbs-link"
    | "internal-link breadcrumbs-link";
}

export interface SquareProps {
  realItems: internalLinkObj[];
  impliedItems: internalLinkObj[];
  fieldName: string;
  app: App;
}
