export const EXPLICIT_EDGE_SOURCES = [
	"typed_link",
	"tag_note",
	"list_note",
	"dendron_note",
	"dataview_note",
	"date_note",
	"folder_note",
] as const;

export type ExplicitEdgeSource = (typeof EXPLICIT_EDGE_SOURCES)[number];

export const EDGE_SORT_FIELDS = [
	"default",
	"basename",
	"path",
	"field",
] as const;
type EdgeSortField = (typeof EDGE_SORT_FIELDS)[number];

export type EdgeSortId = { field: EdgeSortField; order: 1 | -1 };
