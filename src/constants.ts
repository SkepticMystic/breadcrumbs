import type { Constructor } from "obsidian";
import DucksView from "src/DucksView";
import type {
  BCSettings,
  Directions,
  Relations,
  userHierarchy,
  visTypes,
} from "src/interfaces";
import MatrixView from "src/MatrixView";
import StatsView from "src/StatsView";

export const MATRIX_VIEW = "BC-matrix";
export const STATS_VIEW = "BC-stats";
export const DUCK_VIEW = "BC-ducks";

export type MyView = MatrixView | StatsView | DucksView;

export const VIEWS: {
  plain: string;
  type: string;
  constructor: Constructor<MyView>;
  openOnLoad: boolean;
}[] = [
  {
    plain: "Matrix",
    type: MATRIX_VIEW,
    constructor: MatrixView,
    openOnLoad: true,
  },
  {
    plain: "Stats",
    type: STATS_VIEW,
    constructor: StatsView,
    openOnLoad: true,
  },
  { plain: "Duck", type: DUCK_VIEW, constructor: DucksView, openOnLoad: false },
];

export const TRAIL_ICON = "BC-trail-icon";
export const TRAIL_ICON_SVG =
  '<path fill="currentColor" stroke="currentColor" d="M48.8,4c-6,0-13.5,0.5-19.7,3.3S17.9,15.9,17.9,25c0,5,2.6,9.7,6.1,13.9s8.1,8.3,12.6,12.3s9,7.8,12.2,11.5 c3.2,3.7,5.1,7.1,5.1,10.2c0,14.4-13.4,19.3-13.4,19.3c-0.7,0.2-1.2,0.8-1.3,1.5s0.1,1.4,0.7,1.9c0.6,0.5,1.3,0.6,2,0.3 c0,0,16.1-6.1,16.1-23c0-4.6-2.6-8.8-6.1-12.8c-3.5-4-8.1-7.9-12.6-11.8c-4.5-3.9-8.9-7.9-12.2-11.8c-3.2-3.9-5.2-7.7-5.2-11.4 c0-7.8,3.6-11.6,8.8-14S43,8,48.8,8c4.6,0,9.3,0,11,0c0.7,0,1.4-0.4,1.7-1c0.3-0.6,0.3-1.4,0-2s-1-1-1.7-1C58.3,4,53.4,4,48.8,4 L48.8,4z M78.1,4c-0.6,0-1.2,0.2-1.6,0.7l-8.9,9.9c-0.5,0.6-0.7,1.4-0.3,2.2c0.3,0.7,1,1.2,1.8,1.2h0.1l-2.8,2.6 c-0.6,0.6-0.8,1.4-0.5,2.2c0.3,0.8,1,1.3,1.9,1.3h1.3l-4.5,4.6c-0.6,0.6-0.7,1.4-0.4,2.2c0.3,0.7,1,1.2,1.8,1.2h10v4 c0,0.7,0.4,1.4,1,1.8c0.6,0.4,1.4,0.4,2,0c0.6-0.4,1-1,1-1.8v-4h10c0.8,0,1.5-0.5,1.8-1.2c0.3-0.7,0.1-1.6-0.4-2.2L86.9,24h1.3 c0.8,0,1.6-0.5,1.9-1.3c0.3-0.8,0.1-1.6-0.5-2.2l-2.8-2.6h0.1c0.8,0,1.5-0.5,1.8-1.2c0.3-0.7,0.2-1.6-0.3-2.2l-8.9-9.9 C79.1,4.3,78.6,4,78.1,4L78.1,4z M78,9l4.4,4.9h-0.7c-0.8,0-1.6,0.5-1.9,1.3c-0.3,0.8-0.1,1.6,0.5,2.2l2.8,2.6h-1.1 c-0.8,0-1.5,0.5-1.8,1.2c-0.3,0.7-0.1,1.6,0.4,2.2l4.5,4.6H70.8l4.5-4.6c0.6-0.6,0.7-1.4,0.4-2.2c-0.3-0.7-1-1.2-1.8-1.2h-1.1 l2.8-2.6c0.6-0.6,0.8-1.4,0.5-2.2c-0.3-0.8-1-1.3-1.9-1.3h-0.7L78,9z M52.4,12c-4.1,0-7.1,0.5-9.4,1.5c-2.3,1-3.8,2.5-4.5,4.3 c-0.7,1.8-0.5,3.6,0.1,5.2c0.6,1.5,1.5,2.9,2.5,3.9c5.4,5.4,18.1,12.6,29.6,21c5.8,4.2,11.2,8.6,15.1,13c3.9,4.4,6.2,8.7,6.2,12.4 c0,14.5-12.9,18.7-12.9,18.7c-0.7,0.2-1.2,0.8-1.4,1.5s0.1,1.5,0.7,1.9c0.6,0.5,1.3,0.6,2,0.3c0,0,15.6-5.6,15.6-22.5 c0-5.3-2.9-10.3-7.2-15.1C84.6,53.6,79,49,73.1,44.7c-11.8-8.6-24.8-16.3-29.2-20.6c-0.6-0.6-1.2-1.5-1.6-2.4 c-0.3-0.9-0.4-1.7-0.1-2.4c0.3-0.7,0.8-1.4,2.3-2c1.5-0.7,4.1-1.2,7.8-1.2c4.9,0,9.4,0.1,9.4,0.1c0.7,0,1.4-0.3,1.8-1 c0.4-0.6,0.4-1.4,0-2.1c-0.4-0.6-1.1-1-1.8-1C61.9,12.1,57.3,12,52.4,12L52.4,12z M24,46c-0.5,0-1.1,0.2-1.4,0.6L9.2,60.5 c-0.6,0.6-0.7,1.4-0.4,2.2c0.3,0.7,1,1.2,1.8,1.2h3l-6.5,6.8c-0.6,0.6-0.7,1.4-0.4,2.2s1,1.2,1.8,1.2H13l-8.5,8.6 C4,83.2,3.8,84,4.2,84.8C4.5,85.5,5.2,86,6,86h16v5.4c0,0.7,0.4,1.4,1,1.8c0.6,0.4,1.4,0.4,2,0c0.6-0.4,1-1,1-1.8V86h16 c0.8,0,1.5-0.5,1.8-1.2c0.3-0.7,0.1-1.6-0.4-2.2L35,74h4.4c0.8,0,1.5-0.5,1.8-1.2s0.2-1.6-0.4-2.2l-6.5-6.8h3 c0.8,0,1.5-0.5,1.8-1.2c0.3-0.7,0.2-1.6-0.4-2.2L25.4,46.6C25.1,46.2,24.5,46,24,46L24,46z M24,50.9l8.7,9h-3 c-0.8,0-1.5,0.5-1.8,1.2s-0.2,1.6,0.4,2.2l6.5,6.8h-4.5c-0.8,0-1.5,0.5-1.8,1.2c-0.3,0.7-0.1,1.6,0.4,2.2l8.5,8.6H10.8l8.5-8.6 c0.6-0.6,0.7-1.4,0.4-2.2c-0.3-0.7-1-1.2-1.8-1.2h-4.5l6.5-6.8c0.6-0.6,0.7-1.4,0.4-2.2c-0.3-0.7-1-1.2-1.8-1.2h-3L24,50.9z"/>';

export const splitLinksRegex = new RegExp(/\[\[(.+?)\]\]/g);
export const dropHeaderOrAlias = new RegExp(/\[\[([^#|]+)\]\]/);

export const VISTYPES: visTypes[] = [
  "Force Directed Graph",
  "Tidy Tree",
  "Circle Packing",
  "Edge Bundling",
  "Arc Diagram",
  "Sunburst",
  "Tree Map",
  "Icicle",
  "Radial Tree",
];

export const DIRECTIONS: Directions[] = ["up", "same", "down", "next", "prev"];
export const ARROW_DIRECTIONS: { [dir in Directions]: string } = {
  up: "↑",
  same: "↔",
  down: "↓",
  next: "→",
  prev: "←",
};
export const RELATIONS: Relations[] = ["Parent", "Sibling", "Child"];
export const REAlCLOSED = ["Real", "Closed"];
export const ALLUNLINKED = ["All", "No Unlinked"];

export const blankUserHier = (): userHierarchy => {
  return { up: [], same: [], down: [], next: [], prev: [] };
};
export const blankDirObjs = (): { [dir in Directions]: {} } => {
  return {
    up: {},
    same: {},
    down: {},
    next: {},
    prev: {},
  };
};
export const blankDirUndef = (): { [dir in Directions]: undefined } => {
  return {
    up: undefined,
    same: undefined,
    down: undefined,
    next: undefined,
    prev: undefined,
  };
};

export const DEFAULT_SETTINGS: BCSettings = {
  userHierarchies: [
    {
      up: ["up"],
      same: ["same"],
      down: ["down"],
      next: ["next"],
      prev: ["prev"],
    },
  ],
  indexNote: [""],
  CSVPaths: "",
  hierarchyNotes: [""],
  hierarchyNoteDownFieldName: "",
  hierarchyNoteUpFieldName: "",
  refreshIndexOnActiveLeafChange: false,
  altLinkFields: [],
  useAllMetadata: true,
  parseJugglLinksWithoutJuggl: false,
  dvWaitTime: 5000,
  refreshIntervalTime: 0,
  defaultView: true,
  orderField: "order",
  showNameOrType: true,
  showRelationType: true,
  filterImpliedSiblingsOfDifferentTypes: false,
  rlLeaf: true,
  showBCs: true,
  showTrail: true,
  showGrid: true,
  showPrevNext: true,
  limitTrailCheckboxStates: {},
  hideTrailFieldName: "hide-trail",
  gridDots: false,
  dotsColour: "#000000",
  gridHeatmap: false,
  heatmapColour: getComputedStyle(document.body).getPropertyValue(
    "--text-accent"
  ),
  showAll: false,
  noPathMessage: `This note has no real or implied parents`,
  trailSeperator: "→",
  respectReadableLineLength: true,
  limitWriteBCCheckboxStates: {},
  writeBCsInline: false,
  showWriteAllBCsCmd: false,
  visGraph: "Force Directed Graph",
  visRelation: "Parent",
  visClosed: "Real",
  visAll: "All",
  wikilinkIndex: true,
  aliasesInIndex: false,
  debugMode: false,
  superDebugMode: false,
};
