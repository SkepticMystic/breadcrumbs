import type Graph from "graphology";
import type { Constructor, FrontMatterCache, Pos, TFile } from "obsidian";
import type DucksView from "src/DucksView";
import type StatsView from "src/StatsView";
import type MatrixView from "src/MatrixView";

export interface BCSettings {
  userHierarchies: userHierarchy[];
  indexNotes: string[];
  CSVPaths: string;
  hierarchyNotes: string[];
  HNUpField: string;
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
  hideTrailField: string;
  gridDots: boolean;
  dotsColour: string;
  gridHeatmap: boolean;
  heatmapColour: string;
  showAll: boolean;
  noPathMessage: string;
  trailSeperator: string;
  respectReadableLineLength: boolean;
  limitWriteBCCheckboxStates: { [field: string]: boolean };
  writeBCsInline: boolean;
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

export type MyView = MatrixView | StatsView | DucksView;
export type ViewInfo = {
  plain: string;
  type: string;
  constructor: Constructor<MyView>;
  openOnLoad: boolean;
};

export interface dvLink {
  display: any;
  embded: boolean;
  path: string;
  type: string;
}

export interface JugglLink {
  file: TFile;
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

export type RealNImplied = {
  [dir: string]: { reals: SquareItem[]; implieds: SquareItem[] };
};
export type relObj = { [key: string]: string[] } | { current: TFile };

export interface HierarchyNoteItem {
  parentNote: string;
  field: string;
  currNote: string;
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
  field: string;
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

export type HierarchyGraphs = {
  [dir in Directions]: { [field: string]: Graph };
};

export type SquareItem = { to: string; real: boolean; field: string };

export interface MetaeditApi {
  /** Adds the key and value */
  createYamlProperty: (
    key: string,
    value: string,
    file: TFile
  ) => Promise<void>;
  /** Changes `key`'s value to `value` (overwrites) */
  update: (key: string, value: string, file: TFile) => Promise<void>;
}

declare module "obsidian" {
  interface App {
    plugins: {
      plugins: {
        dataview: { api: { page: (page: string) => dvFrontmatterCache } };
        metaedit: {
          api: MetaeditApi;
        };
        juggl: { settings: { typedLinkPrefix: string } };
      };
      enabledPlugins: { has: (plugin: string) => boolean };
    };
  }
}
