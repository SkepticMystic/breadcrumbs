const METADATA_FIELDS_LIST = [
	"BC-tag-note",
	"BC-tag-note-field",
	"BC-tag-note-exact",
] as const;

export type MetadataField = (typeof METADATA_FIELDS_LIST)[number];

export const META_FIELD = {
	"tag-note": "BC-tag-note",
	"tag-note-field": "BC-tag-note-field",
	"tag-note-exact": "BC-tag-note-exact",
} satisfies Record<string, MetadataField>;

if (Object.keys(META_FIELD).length !== METADATA_FIELDS_LIST.length) {
	throw new Error("Missing keys in META_FIELD");
}
