import type { Edge, Graph } from "graphlib";
import type { FrontMatterCache, Pos, TFile } from "obsidian";
import type { DIRECTIONS, RELATIONS } from "src/constants";

export interface BreadcrumbsSettings {
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
  showNameOrType: boolean;
  showRelationType: boolean;
  filterImpliedSiblingsOfDifferentTypes: boolean;
  rlLeaf: boolean;
  showTrail: boolean;
  limitTrailCheckboxStates: { [field: string]: boolean };
  hideTrailFieldName: string;
  trailOrTable: 1 | 2 | 3;
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

export type Directions = typeof DIRECTIONS[number];
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
  alt: string | null;
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

export type Relations = typeof RELATIONS[number];

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

export type HierarchyFields = {
  [dir in Directions]: { [field: string]: string[] };
};

export interface BCIndex {
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

declare module "obsidian" {
  interface App {
    plugins: {
      plugins: {
        dataview: { api: { index: { pages: Map<string, {}> } } };
        juggl: any;
        metaedit: {
          api: {
            getAutopropFunction: () => any;
            getUpdateFunction: () => any;
            getFileFromTFileOrPath: () => any;
            getGetPropertyValueFunction: () => any;
            getGetFilesWithPropertyFunction: () => any;
            getCreateYamlPropertyFunction: () => any;
            getGetPropertiesInFile: () => any;
          };
        };
      };
    };
  }
}
