import type { MultiGraph } from "graphology";
import type Graph from "graphology";
import type { FrontMatterCache, Pos, TFile } from "obsidian";

export interface BCSettings {
  userHierarchies: userHierarchy[];
  indexNote: string[];
  CSVPaths: string;
  hierarchyNotes: string[];
  hierarchyNoteDownFieldName: string;
  hierarchyNoteUpFieldName: string;
  refreshIndexOnActiveLeafChange: boolean;
  altLinkFields: string[];
  useAllMetadata: boolean;
  parseJugglLinksWithoutJuggl: boolean;
  dvWaitTime: number;
  refreshIntervalTime: number;
  defaultView: boolean;
  orderField: string;
  showNameOrType: boolean;
  showRelationType: boolean;
  filterImpliedSiblingsOfDifferentTypes: boolean;
  rlLeaf: boolean;
  showBCs: boolean;
  showTrail: boolean;
  showGrid: boolean;
  showPrevNext: boolean;
  limitTrailCheckboxStates: { [field: string]: boolean };
  hideTrailFieldName: string;
  gridDots: boolean;
  dotsColour: string;
  gridHeatmap: boolean;
  heatmapColour: string;
  showAll: boolean;
  noPathMessage: string;
  trailSeperator: string;
  respectReadableLineLength: boolean;
  limitWriteBCCheckboxStates: { [field: string]: boolean };
  showWriteAllBCsCmd: boolean;
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

export type Directions = "up" | "same" | "down" | "next" | "prev";
export type userHierarchy = {
  [dir in Directions]: string[];
};

export interface dvLink {
  display: any;
  embded: boolean;
  path: string;
  type: string;
}

export interface JugglLink {
  note: string;
  links: {
    dir: Directions | "";
    type: string;
    linksInLine: string[];
  }[];
}

export interface neighbourObj {
  current: TFile;
  /** DV only recognises it if it's a string? */
  order: string;
  hierarchies: HierarchyFields[];
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
  alt: string | null;
  order: number;
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
      edges: string[];
      edgesStr: string;
    };
  };
};

export type HierarchyFields = {
  [dir in Directions]: { [field: string]: string[] };
};

export interface BCIndex {
  main: MultiGraph;
  hierGs: HierarchyGraphs[];
  mergedGs: MergedGraphs;
  closedGs: ClosedGraphs;
  limitTrailG: Graph;
}

export type HierarchyGraphs = {
  [dir in Directions]: { [field: string]: Graph };
};

export type MergedGraphs = {
  [dir in Directions]: Graph;
};

export type ClosedGraphs = {
  [dir in Directions]: Graph;
};

export type PrevNext = { to: string; real: boolean; fieldName: string };
