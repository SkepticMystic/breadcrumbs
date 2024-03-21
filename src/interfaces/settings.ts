import type { ListIndex } from "src/commands/list_index";
import type { Direction } from "src/const/hierarchies";
import type { BCEdgeAttributes } from "src/graph/MyMultiGraph";
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

	custom_implied_relations: {
		transitive: {
			rounds: number;
			chain: Partial<BCEdgeAttributes>[];
			/** The transitive closure field */
			close_field: string;
		}[];
	};

	explicit_edge_sources: {
		// Just a regular `up: [[link]]` or `down:: [[link]]` in the content/frontmatter of a note
		// The two are not distinguished, because Dataview doesn't distinguish them
		typed_link: {};
		tag_note: {
			default_field: string;
		};
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

		regex_note: {
			default_field: string;
		};
	};

	views: {
		page: {
			/** Constrain max-width to var(--file-line-width) */
			all: {
				readable_line_width: boolean;
			};

			trail: {
				enabled: boolean;
				default_depth: number;
				format: "grid" | "path";
				selection: "all" | "shortest" | "longest";
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

			tree: {
				default_dir: Direction;
				show_node_options: ShowNodeOptions;
			};
		};
	};

	commands: {
		rebuild_graph: {
			notify: boolean;

			trigger: {
				// TODO: Not actually implemented yet
				note_save: boolean;
				layout_change: boolean;
			};
		};

		list_index: {
			default_options: ListIndex.Options;
		};

		freeze_implied_edges: {
			default_options: {
				destination: "frontmatter" | "dataview-inline";
			};
		};
	};

	codeblocks: {
		show_node_options: ShowNodeOptions;
	};
}

export type OLD_BREADCRUMBS_SETTINGS = Partial<{
	// SECTION: Hierarchies
	userHiers: Hierarchy["dirs"][]; // MIGRATED

	// SECTION: explicit_edge_sources
	addDateNotes: boolean; // MIGRATED

	CSVPaths: string;

	dataviewNoteField: string;

	addDendronNotes: boolean; // MIGRATED
	dendronNoteDelimiter: string; // MIGRATED
	dendronNoteField: string; // MIGRATED
	trimDendronNotes: boolean; // MIGRATED

	dateNoteFormat: string; // MIGRATED
	dateNoteField: string; // MIGRATED
	dateNoteAddMonth: string;
	dateNoteAddYear: string;

	hierarchyNotes: string[]; // NOT NEEDED - BC-list-note-field
	hierarchyNoteIsParent: boolean; // NOT NEEDED - BC-list-note-exact
	HNUpField: string; // NOT NEEDED - BC-list-note-field

	namingSystemField: string;
	namingSystemRegex: string;
	namingSystemSplit: string;
	namingSystemEndsWithDelimiter: boolean;

	regexNoteField: string;

	tagNoteField: string; // MIGRATED

	// SECTION: Implied relations
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

	// treatCurrNodeAsImpliedSibling: boolean; // NOT NEEDED, impliedRelations.siblingIdentity covers it

	// SECTION: Views
	// These two should be one setting, deciding sort_order and sort_by
	alphaSortAsc: boolean;
	enableAlphaSort: boolean;

	/** An array of fields going _up_ which **will** be shown in the trail view */
	limitTrailCheckboxes: string[];

	// Default layout to use for Juggl view
	// jugglLayout: JugglLayouts;
	parseJugglLinksWithoutJuggl: boolean;
	showUpInJuggl: boolean;
	showJuggl: boolean;

	gridDefaultDepth: number; // MIGRATED

	noPathMessage: string; // MIGRATED

	// Dunno if I'll add these... Obsidian remembers if they were open,
	//   and the side they were opened on
	rlLeaf: boolean; // NOT NEEDED
	openMatrixOnLoad: boolean; // NOT NEEDED
	// openStatsOnLoad: boolean; // NOT NEEDED
	openDuckOnLoad: boolean; // NOT NEEDED
	openDownOnLoad: boolean; // NOT NEEDED

	respectReadableLineLength: boolean; // MIGRATED
	showAllPathsIfNoneToIndexNote: boolean;

	showAllAliases: boolean; // ?
	showNameOrType: boolean; // ?
	showRelationType: boolean;

	sortByNameShowAlias: boolean;

	showTrail: boolean; // NOT NEEDED
	showBCs: boolean; // MIGRATED
	showBCsInEditLPMode: boolean;

	// showAll: string; // NOT NEEDED, we infer from the enabled field on each page view
	showGrid: boolean; // MIGRATED
	// showImpliedRelations: boolean; // NOT NEEDED, can just disable all implied relations

	showPrevNext: boolean; // MIGRATED

	squareDirectionsOrder: (0 | 1 | 2 | 3 | 4)[];

	// trailSeperator: string; // NOT NEEDED, no path view

	// visGraph: VisType;
	// visRelation: Relations;
	// visClosed: string;
	// visAll: string;

	// SECTION: Commands
	aliasesInIndex: boolean; // MIGRATED
	createIndexIndent: string; // MIGRATED
	wikilinkIndex: boolean; // MIGRATED

	refreshOnNoteSave: boolean; // MIGRATED
	refreshOnNoteChange: boolean; // MIGRATED
	showRefreshNotice: boolean; // MIGRATED

	showWriteAllBCsCmd: boolean;
	writeBCsInline: boolean; // MIGRATED

	/** An array of fields in all directions which **will** get written when running `Write implied BCs to file` */
	limitWriteBCCheckboxes: string[];
	limitJumpToFirstFields: string[];

	threadIntoNewPane: boolean;
	threadingTemplate: string;
	threadingDirTemplates: { [dir in Direction]: string };
	threadUnderCursor: boolean;

	// SECTION: Not sure?
	altLinkFields: string[]; // ?

	dateFormat: string; // ?

	filterImpliedSiblingsOfDifferentTypes: boolean; // ? I think this was a plaster on a bug

	indexNotes: string[]; // NOT NEEDED - not going to implement

	// SECTION: Suggestors
	enableRelationSuggestor: boolean;
	fieldSuggestor: boolean;
	relSuggestorTrigger: string;

	// SECTION: Misc

	useAllMetadata: boolean;

	// dvWaitTime: number; // NOT NEEDED

	debugMode: 0 | 1 | 2;

	// CHECKBOX_STATES_OVERWRITTEN: boolean; // NOT NEEDED
}>;
