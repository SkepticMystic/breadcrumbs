import type { ListIndex } from "src/commands/list_index";
import type { Direction } from "src/const/hierarchies";
import type { Hierarchy } from "./hierarchies";

export type ShowNodeOptions = {
	ext: boolean;
	folder: boolean;
	alias: boolean;
};

export interface BreadcrumbsSettings {
	// Once I've reach settings parity with old BC, I can add this flag to skip over all the checks in migrate_old_settings
	// But for now, as I add new (old) settings, I don't want to skip migrating them
	// V4_MIGRATED: boolean;

	hierarchies: Hierarchy[];

	explicit_edge_sources: {
		// Just a regular `up: [[link]]` or `down:: [[link]]` in the content/frontmatter of a note
		// The two are not distinguished, because Dataview doesn't distinguish them
		typed_link: {};
		tag_note: {};
		list_note: {};
		dendron_note: {
			enabled: boolean;
			// Should BC-dendron-note-delimiter be a thing too?
			// With the current setup, it would only apply to a single edge per note
			delimiter: string;
			default_field: string;
			display_trimmed: boolean;
		};

		date_note: {
			enabled: boolean;
			date_format: string;
			default_field: string;
		};
	};

	views: {
		page: {
			/** Constrain max-width to var(--file-line-width) */
			all: {
				readable_line_width: boolean;
			};

			grid: {
				enabled: boolean;
				no_path_message: string;
				show_node_options: ShowNodeOptions;
			};
			prev_next: {
				enabled: boolean;
				show_node_options: ShowNodeOptions;
			};
		};
		side: {
			matrix: {
				show_node_options: ShowNodeOptions;
			};
		};
	};

	commands: {
		list_index: {
			default_options: ListIndex.Options;
		};

		freeze_implied_edges: {
			default_options: {
				destination: "frontmatter" | "dataview-inline";
			};
		};
	};
}

export type OLD_BREADCRUMBS_SETTINGS = Partial<{
	addDendronNotes: boolean; // MIGRATED
	addDateNotes: boolean;
	aliasesInIndex: boolean; // MIGRATED
	alphaSortAsc: boolean;
	altLinkFields: string[];
	CSVPaths: string;
	createIndexIndent: string; // MIGRATED
	// dvWaitTime: number; // NOT NEEDED
	dataviewNoteField: string;
	debugMode: 0 | 1 | 2;
	dendronNoteDelimiter: string; // MIGRATED
	dendronNoteField: string; // MIGRATED
	dateFormat: string;
	dateNoteFormat: string;
	dateNoteField: string;
	dateNoteAddMonth: string;
	dateNoteAddYear: string;
	enableAlphaSort: boolean;
	enableRelationSuggestor: boolean;
	fieldSuggestor: boolean;
	filterImpliedSiblingsOfDifferentTypes: boolean;
	gridDefaultDepth: number;
	hierarchyNotes: string[];
	hierarchyNoteIsParent: boolean;
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
	}; // MIGRATED
	indexNotes: string[];
	// Default layout to use for Juggl view
	// jugglLayout: JugglLayouts;
	/** An array of fields going _up_ which **will** be shown in the trail view */
	limitTrailCheckboxes: string[];
	/** An array of fields in all directions which **will** get written when running `Write implied BCs to file` */
	limitWriteBCCheckboxes: string[];
	limitJumpToFirstFields: string[];
	// CHECKBOX_STATES_OVERWRITTEN: boolean; // NOT NEEDED
	namingSystemField: string;
	namingSystemRegex: string;
	namingSystemSplit: string;
	namingSystemEndsWithDelimiter: boolean;
	noPathMessage: string; // MIGRATED
	openMatrixOnLoad: boolean;
	// openStatsOnLoad: boolean;
	openDuckOnLoad: boolean;
	openDownOnLoad: boolean;
	parseJugglLinksWithoutJuggl: boolean;
	refreshOnNoteChange: boolean;
	refreshOnNoteSave: boolean;
	respectReadableLineLength: boolean; // MIGRATED
	showAllPathsIfNoneToIndexNote: boolean;
	showAllAliases: boolean;
	showNameOrType: boolean;
	showRelationType: boolean;
	showWriteAllBCsCmd: boolean;
	sortByNameShowAlias: boolean;
	regexNoteField: string;
	relSuggestorTrigger: string;
	rlLeaf: boolean;
	showBCs: boolean; // TODO: What's difference between showBCs and showTrail?
	showBCsInEditLPMode: boolean;
	// showAll: string; // NOT NEEDED, we infer from the enabled field on each page view
	showGrid: boolean; // MIGRATED
	// showImpliedRelations: boolean; // NOT NEEDED, can just disable all implied relations
	showUpInJuggl: boolean;
	showJuggl: boolean;
	showPrevNext: boolean; // MIGRATED
	showRefreshNotice: boolean;
	showTrail: boolean;
	squareDirectionsOrder: (0 | 1 | 2 | 3 | 4)[];
	tagNoteField: string;
	threadIntoNewPane: boolean;
	threadingTemplate: string;
	threadingDirTemplates: { [dir in Direction]: string };
	threadUnderCursor: boolean;
	// trailSeperator: string; // NOT NEEDED, no path view
	// treatCurrNodeAsImpliedSibling: boolean; // NOT NEEDED, impliedRelations.siblingIdentity covers it
	trimDendronNotes: boolean; // MIGRATED
	useAllMetadata: boolean;
	userHiers: Hierarchy["dirs"][];
	// visGraph: VisType;
	// visRelation: Relations;
	// visClosed: string;
	// visAll: string;
	writeBCsInline: boolean; // MIGRATED
	wikilinkIndex: boolean; // MIGRATED
}>;
