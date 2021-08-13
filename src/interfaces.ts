import type { Graph } from "graphlib";
import type { FrontMatterCache, Pos, TFile } from "obsidian";

export interface BreadcrumbsSettings {
  userHierarchies: userHierarchy[];
  indexNote: string[];
  refreshIntervalTime: number;
  defaultView: boolean;
  showNameOrType: boolean;
  showRelationType: boolean;
  rlLeaf: boolean;
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
  visGraph: visTypes;
  visRelation: Relations;
  visClosed: string;
  visAll: string;
  wikilinkIndex: boolean;
  aliasesInIndex: boolean;
  debugMode: boolean;
  superDebugMode: boolean;
}

export interface dvFrontmatterCache {
  file: TFile;
  [field: string]:
    | string
    | string[]
    | string[][]
    | dvLink
    | dvLink[]
    | Pos
    | TFile;
}

export type Directions = "up" | "same" | "down";
export interface userHierarchy {
  up: string[];
  same: string[];
  down: string[];
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

export type relObj = { [key: string]: string[] } | { current: TFile };

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

export interface d3Tree {
  name: string;
  children?: d3Tree[];
  value?: string | number;
}

export interface AdjListItem {
  id?: number;
  name: string;
  pres?: string[] | undefined;
  succs?: string[] | undefined;
  parentId?: string | number;
  depth?: number;
  height?: number;
}

export interface d3Node {
  id: number;
  name: string;
  value?: number;
}

export interface d3Link {
  source: number | string;
  target: number | string;
}

export interface d3Graph {
  nodes: d3Node[];
  links: d3Link[];
}

export type Relations = "Parent" | "Sibling" | "Child";

export type VisGraphs = {
  [relation in Relations]: {
    [direction in "Real" | "Closed"]: {
      [unlikedQ in "All" | "No Unlinked"]: Graph;
    };
  };
};

export type visTypes =
  | "Force Directed Graph"
  | "Tidy Tree"
  | "Circle Packing"
  | "Edge Bundling"
  | "Arc Diagram"
  | "Sunburst"
  | "Tree Map"
  | "Icicle"
  | "Radial Tree";

export type HierData = {
  [dir in Directions]: {
    [graphs: string]: {
      graph?: Graph;
      nodes: string[];
      nodesStr: string;
      edges: Edge[];
      edgesStr: string;
    };
  };
};
