import type { Graph } from "graphlib";
import type { FrontMatterCache, Pos, TFile } from "obsidian";

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
  trailOrTable: 1 | 2 | 3;
  gridDots: boolean;
  dotsColour: string;
  gridHeatmap: boolean;
  heatmapColour: string;
  showAll: boolean;
  noPathMessage: string;
  trailSeperator: string;
  respectReadableLineLength: boolean;
  wikilinkIndex: boolean;
  aliasesInIndex: boolean;
  debugMode: boolean;
  superDebugMode: boolean;
}

export interface dvFrontmatterCache {
  file: TFile | any;
  [field: string]: string | string[] | string[][] | dvLink | dvLink[] | Pos;
}

export interface dvLink {
  display: any;
  embded: boolean;
  path: string;
  type: string;
}

export interface JugglLink {
  note: string;
  links: {
    type: string;
    linksInLine: string[];
  }[];
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
