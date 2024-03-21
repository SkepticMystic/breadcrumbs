export const EXPLICIT_EDGE_SOURCES = [
	"typed_link",
	"tag_note",
	"list_note",
	"dendron_note",
	"dataview_note",
	"date_note",
	"folder_note",
	"regex_note",
] as const;

export type ExplicitEdgeSource = (typeof EXPLICIT_EDGE_SOURCES)[number];

export const SIMPLE_EDGE_SORT_FIELDS = [
	"implicit",
	"basename",
	"path",
	"field",
] as const;
type SimpleEdgeSortField = (typeof SIMPLE_EDGE_SORT_FIELDS)[number];

export const COMPLEX_EDGE_SORT_FIELD_PREFIXES = [
	// BREAKING: rather use neighbour-field
	"neighbour",
	"neighbour-field",
	"neighbour-dir",
] as const;
export type ComplexEdgeSortFieldPrefix =
	(typeof COMPLEX_EDGE_SORT_FIELD_PREFIXES)[number];

export type EdgeSortId = {
	field: SimpleEdgeSortField | `${ComplexEdgeSortFieldPrefix}:${string}`;
	order: 1 | -1;
};
