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
