import type { App, FrontMatterCache, TFile } from "obsidian";

export interface BreadcrumbsSettings {
  parentFieldName: string;
  siblingFieldName: string;
  childFieldName: string;
  indexNote: string;
  refreshIntervalTime: number;
  defaultView: boolean;
  showNameOrType: boolean;
  showRelationType: boolean;
  showTrail: boolean;
  trailSeperator: string;
  respectReadableLineLength: boolean;
  debugMode: boolean;
}

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
  cls: string;
}

export interface SquareProps {
  realItems: internalLinkObj[];
  impliedItems: internalLinkObj[];
  fieldName: string;
  app: App;
}
