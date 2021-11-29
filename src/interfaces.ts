import type { MultiGraph } from "graphology";
import type { LogLevel } from "loglevel";
import type { Constructor, FrontMatterCache, Pos, TFile } from "obsidian";
import type { DIRECTIONS } from "./constants";
import type DucksView from "./DucksView";
import type MatrixView from "./MatrixView";
import type StatsView from "./StatsView";

export type DebugLevel = keyof LogLevel;
export interface BCSettings {
  aliasesInIndex: boolean;
  alphaSortAsc: boolean;
  altLinkFields: string[];
  CSVPaths: string;
  dvWaitTime: number;
  debugMode: DebugLevel;
  defaultView: boolean;
  dotsColour: string;
  fieldSuggestor: boolean;
  filterImpliedSiblingsOfDifferentTypes: boolean;
  gridDots: boolean;
  gridHeatmap: boolean;
  heatmapColour: string;
  hierarchyNotes: string[];
  HNUpField: string;
  indexNotes: string[];
  limitTrailCheckboxStates: { [field: string]: boolean };
  limitWriteBCCheckboxStates: { [field: string]: boolean };
  noPathMessage: string;
  parseJugglLinksWithoutJuggl: boolean;
  refreshOnNoteChange: boolean;
  respectReadableLineLength: boolean;
  showAllPathsIfNoneToIndexNote: boolean;
  showNameOrType: boolean;
  showRelationType: boolean;
  showWriteAllBCsCmd: boolean;
  rlLeaf: boolean;
  showBCs: boolean;
  showBCsInEditLPMode: boolean;
  showAll: boolean;
  showGrid: boolean;
  showPrevNext: boolean;
  showTrail: boolean;
  trailSeperator: string;
  useAllMetadata: boolean;
  userHiers: UserHier[];
  visGraph: visTypes;
  visRelation: Relations;
  visClosed: string;
  visAll: string;
  writeBCsInline: boolean;
  wikilinkIndex: boolean;
}

export type RawValue =
  | string
  | number
  | dvLink
  | Pos
  | TFile
  | undefined
  | typeof Proxy;

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

export type Directions = typeof DIRECTIONS[number];
export type UserHier = {
  [dir in Directions]: string[];
};

export type MyView = MatrixView | DucksView | StatsView;
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
    field: string;
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
  parent?: string;
}

export interface SquareProps {
  realItems: internalLinkObj[];
  impliedItems: internalLinkObj[];
  field: string;
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
      [unlikedQ in "All" | "No Unlinked"]: MultiGraph;
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
      graph?: MultiGraph;
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
  [dir in Directions]: { [field: string]: MultiGraph };
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
