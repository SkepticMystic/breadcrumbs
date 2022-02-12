import type { MultiGraph } from "graphology";
import type { IJugglSettings, JugglLayouts } from "juggl-api";
import type { LogLevel } from "loglevel";
import type { DateTime } from "luxon";
import type { Constructor, Pos, TFile } from "obsidian";
import type {
  CODEBLOCK_FIELDS,
  CODEBLOCK_TYPES,
  DIRECTIONS,
} from "./constants";
import type DucksView from "./Views/DucksView";
import type MatrixView from "./Views/MatrixView";
import type StatsView from "./Views/StatsView";
import type TreeView from "./Views/TreeView";

export type DebugLevel = keyof LogLevel;
export interface BCSettings {
  addDendronNotes: boolean;
  addDateNotes: boolean;
  aliasesInIndex: boolean;
  alphaSortAsc: boolean;
  altLinkFields: string[];
  CSVPaths: string;
  dvWaitTime: number;
  dataviewNoteField: string;
  debugMode: DebugLevel;
  defaultView: boolean;
  dendronNoteDelimiter: string;
  dendronNoteField: string;
  dateFormat: string;
  dateNoteFormat: string;
  dateNoteField: string;
  dateNoteAddMonth: string;
  dateNoteAddYear: string;
  downViewWrap: boolean;
  dotsColour: string;
  enableAlphaSort: boolean;
  enableRelationSuggestor: boolean;
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
    /** Your siblings' parents are your parents */
    siblingsParentIsParent: boolean;
    /** Aunt and Uncle */
    parentsSiblingsIsParents: boolean;
    /** Grandparents */
    parentsParentsIsParent: boolean;
    /** If two separate parents are siblings, their children are cousins */
    cousinsIsSibling: boolean;
  };
  indexNotes: string[];
  // Default layout to use for Juggl view
  jugglLayout: JugglLayouts;
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
  overflowMLView: boolean;
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
  relSuggestorTrigger: string;
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
  threadUnderCursor: boolean;
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

export type RealNImplied = {
  [dir: string]: { reals: SquareItem[]; implieds: SquareItem[] };
};

export interface HierarchyNoteItem {
  parent: string;
  field: string;
  note: string;
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

export type SquareItem = {
  to: string;
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
            pages: (query: string) => { values: dvFrontmatterCache[] };
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
  interface View {
    editor: Editor;
  }
  interface TFile {
    day?: DateTime;
  }
}

export interface ParsedCodeblock extends IJugglSettings {
  dir: Directions;
  fields: string[];
  title: false | undefined;
  depth: string[];
  flat: true | undefined;
  type: CodeblockType;
  content: string;
  from: string;
  implied: false | undefined;
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

export interface BCAPII {
  mainG: MultiGraph;
  closedG: MultiGraph;

  /** Build the obsidian graph as a graphology MultiGraph */
  buildObsGraph: () => MultiGraph;

  /**
   * Return a subgraph of all nodes & edges with `dirs.includes(a.dir)`
   *
   * Filter the given graph to only include edges in the given directions.
   * @param  {MultiGraph} g - The graph to search. Defaults to `plugin.mainG`
   * @param  {Directions} dir - An array of directions to look for.
   */
  getSubInDirs: (dirs: Directions[], g: MultiGraph) => MultiGraph;

  /**
   * Return a subgraph of all nodes & edges with `fields.includes(a.field)`.
   *
   * Filter the given graph to only include edges with the given fields.
   * @param  {MultiGraph} g - The graph to search. Defaults to `plugin.mainG`
   * @param  {string[]} fields - An array of fields to look for.
   */
  getSubForFields: (fields: Directions[], g: MultiGraph) => MultiGraph;

  /**
   * Finds all paths from a starting node to all other sinks in a graph.
   *
   *
   * @param {MultiGraph} g - The graph to search. Defaults to `plugin.mainG`
   * @param {string} fromNode - The starting node
   * @returns An array of arrays. Each array is a path.
   */
  dfsAllPaths: (fromNode: string, g: MultiGraph) => string[][];

  /** Get the Breadcrumb neighbours of the current note, split by `direction` and `real/implied`
   * @param {string} fromNode - The starting node
   */
  getMatrixNeighbours: (fromNode: string) => RealNImplied;
}
