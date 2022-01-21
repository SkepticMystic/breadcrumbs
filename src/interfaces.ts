import type { MultiGraph } from "graphology";
import type { LogLevel } from "loglevel";
import type { Constructor, FrontMatterCache, Pos, TFile } from "obsidian";
import type TreeView from "./Views/TreeView";
import type {
  CODEBLOCK_FIELDS,
  CODEBLOCK_TYPES,
  DIRECTIONS,
} from "./constants";
import type DucksView from "./Views/DucksView";
import type MatrixView from "./Views/MatrixView";
import type StatsView from "./Views/StatsView";
import type { IJugglSettings } from "juggl-api";

export type DebugLevel = keyof LogLevel;
export interface BCSettings {
  addDendronNotes: boolean;
  aliasesInIndex: boolean;
  alphaSortAsc: boolean;
  altLinkFields: string[];
  CSVPaths: string;
  dvWaitTime: number;
  debugMode: DebugLevel;
  defaultView: boolean;
  dendronNoteDelimiter: string;
  dendronNoteField: string;
  dateFormat: string;
  downViewWrap: boolean;
  dotsColour: string;
  enableAlphaSort: boolean;
  fieldSuggestor: boolean;
  filterImpliedSiblingsOfDifferentTypes: boolean;
  gridDots: boolean;
  gridHeatmap: boolean;
  heatmapColour: string;
  hierarchyNotes: string[];
  HNUpField: string;
  /** WARNING: The defaults for this feature are all `false`! */
  impliedRelations: {
    /** Has it's own toggle already */
    siblingIdentity: boolean;
    /** TypeII implied (currently) */
    sameParentIsSibling: boolean;
    /** Traverse siblings horizontally to make all siblings siblings of each other */
    siblingsSiblingIsSibling: boolean;
    /** Aunt and Uncle */
    parentsSiblingsIsParents: boolean;
    /** Grandparents */
    parentsParentsIsParent: boolean;
    /** If two separate parents are siblings, their children are cousins */
    cousinsIsSibling: boolean;
  };
  indexNotes: string[];
  /** An array of fields going _up_ which **will** be shown in the trail view */
  limitTrailCheckboxes: string[];
  /** An array of fields in all directions which **will** get written when running `Write implied BCs to file` */
  limitWriteBCCheckboxes: string[];
  limitJumpToFirstFields: string[];
  CHECKBOX_STATES_OVERWRITTEN: boolean;
  namingSystemField: string;
  namingSystemRegex: string;
  namingSystemSplit: string;
  namingSystemEndsWithDelimiter: boolean;
  noPathMessage: string;
  openMatrixOnLoad: boolean;
  openStatsOnLoad: boolean;
  openDuckOnLoad: boolean;
  openDownOnLoad: boolean;
  parseJugglLinksWithoutJuggl: boolean;
  refreshOnNoteChange: boolean;
  respectReadableLineLength: boolean;
  showAllPathsIfNoneToIndexNote: boolean;
  showAllAliases: boolean;
  showNameOrType: boolean;
  showRelationType: boolean;
  showWriteAllBCsCmd: boolean;
  sortByNameShowAlias: boolean;
  regexNoteField: string;
  rlLeaf: boolean;
  showBCs: boolean;
  showBCsInEditLPMode: boolean;
  showAll: boolean;
  showGrid: boolean;
  showImpliedRelations: boolean;
  showJuggl: boolean;
  showPrevNext: boolean;
  showRefreshNotice: boolean;
  showTrail: boolean;
  squareDirectionsOrder: (0 | 1 | 2 | 3 | 4)[];
  tagNoteField: string;
  threadIntoNewPane: boolean;
  threadingTemplate: string;
  threadingDirTemplates: { [dir in Directions]: string };
  trailSeperator: string;
  treatCurrNodeAsImpliedSibling: boolean;
  trimDendronNotes: boolean;
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
export type CodeblockType = typeof CODEBLOCK_TYPES[number];
export type CodeblockFields = typeof CODEBLOCK_FIELDS[number];

export type MyView = MatrixView | DucksView | StatsView | TreeView;
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
  parent: string;
  field: string;
  note: string;
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
  implied: string;
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

export type SquareItem = {
  to: string;
  real: boolean;
  field: string;
  implied?: string;
};

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
        dataview: {
          api: {
            page: (page: string) => dvFrontmatterCache;
            pagePaths: (query?: string) => { values: string[] };
          };
        };
        metaedit: {
          api: MetaeditApi;
        };
        juggl: { settings: { typedLinkPrefix: string } };
      };
      enabledPlugins: { has: (plugin: string) => boolean };
    };
    commands: { executeCommandById: (id: string) => void };
  }
}

export interface ParsedCodeblock extends IJugglSettings {
  dir: Directions;
  fields: string[];
  title: string;
  depth: string[];
  flat: string;
  type: CodeblockType;
  content: string;
  from: string;
  implied: string;
}

export interface NodePath {
  node: string;
  path: string[];
}

export interface EdgeAttr {
  dir: Directions;
  field: string;
  implied?: string;
}
