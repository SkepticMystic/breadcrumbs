import type { Graph } from "graphlib";
import type { FrontMatterCache, TFile } from "obsidian";

export interface BreadcrumbsSettings {
  parentFieldName: string;
  siblingFieldName: string;
  childFieldName: string;
  indexNote: string[];
  refreshIntervalTime: number;
  defaultView: boolean;
  showNameOrType: boolean;
  showRelationType: boolean;
  showTrail: boolean;
  trailOrTable: boolean;
  showAll: boolean;
  noPathMessage: string;
  trailSeperator: string;
  respectReadableLineLength: boolean;
  debugMode: boolean;
  superDebugMode: boolean;
}

export interface JugglLink {
  note: string;
  links: {
    type: string;
    linksInLine: string[];
  }[]
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
  cls: string;
}

export interface SquareProps {
  realItems: internalLinkObj[];
  impliedItems: internalLinkObj[];
  fieldName: string;
}

export interface allGraphs {
  gParents: Graph;
  gSiblings: Graph;
  gChildren: Graph;
}
