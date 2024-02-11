const METADATA_FIELDS_LIST = [
	"BC-tag-note-tag",
	"BC-tag-note-field",
	"BC-tag-note-exact",
	//
	"BC-folder-note-field",
	"BC-folder-note-recurse",
	"BC-list-note-field",
	"BC-list-note-exclude-index",
	//
	"BC-dendron-note-field",
	//
	"BC-dataview-note-query",
	"BC-dataview-note-field",
] as const;

export type MetadataField = (typeof METADATA_FIELDS_LIST)[number];

export const META_FIELD = {
	"tag-note-tag": "BC-tag-note-tag",
	"tag-note-field": "BC-tag-note-field",
	"tag-note-exact": "BC-tag-note-exact",
	//
	"folder-note-field": "BC-folder-note-field",
	"folder-note-recurse": "BC-folder-note-recurse",
	//
	"list-note-field": "BC-list-note-field",
	"list-note-exclude-index": "BC-list-note-exclude-index",
	//
	"dendron-note-field": "BC-dendron-note-field",
	//
	"dataview-note-query": "BC-dataview-note-query",
	"dataview-note-field": "BC-dataview-note-field",
} satisfies Record<string, MetadataField>;

if (Object.keys(META_FIELD).length !== METADATA_FIELDS_LIST.length) {
	throw new Error("Missing keys in META_FIELD");
}
