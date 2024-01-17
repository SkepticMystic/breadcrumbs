import type { Direction } from "src/const/hierarchies";
import { META_FIELD } from "src/const/metadata_fields";
import type { GraphBuilder } from "src/interfaces/graph";
import type BreadcrumbsPlugin from "src/main";
import { get_field_hierarchy } from "src/utils/hierarchies";
import { fail, succ } from "src/utils/result";
import { ensure_starts_with } from "src/utils/strings";

const get_tag_note_info = (
	plugin: BreadcrumbsPlugin,
	metadata: Record<string, unknown> | undefined,
) => {
	if (!metadata) {
		return fail(undefined);
	}

	const raw_tag = metadata[META_FIELD["tag-note-tag"]];
	if (!raw_tag) {
		return fail(undefined);
	} else if (typeof raw_tag !== "string") {
		return fail({ msg: "tag-note is not a string" });
	}
	const tag = ensure_starts_with(raw_tag, "#");

	const field = metadata[META_FIELD["tag-note-field"]];
	if (!field) {
		return fail(undefined);
	} else if (typeof field !== "string") {
		return fail({ msg: "tag-note-field is not a string" });
	}

	const field_hierarchy = get_field_hierarchy(
		plugin.settings.hierarchies,
		field,
	);
	if (!field_hierarchy) {
		return fail({ msg: "No field hierarchy found" });
	}

	const exact = Boolean(metadata[META_FIELD["tag-note-exact"]]);

	return succ({ tag, field, exact, field_hierarchy });
};

export const _add_explicit_edges_tag_note: GraphBuilder = (
	graph,
	plugin,
	all_files,
) => {
	// More efficient than quadratic looping over all_files,
	// We gather the tag_notes, and the tags the each note has in one go
	const tag_notes: {
		tag: string;
		field: string;
		dir: Direction;
		exact: boolean;
		hierarchy_i: number;
		source_path: string;
	}[] = [];

	// From tag, to paths with that tag
	const tag_paths_map = new Map<string, string[]>();

	all_files.obsidian?.forEach((source_file) => {
		const source_cache = plugin.app.metadataCache.getFileCache(source_file);
		if (!source_cache) return;

		source_cache?.tags?.forEach(({ tag }) => {
			// Quite happy with this trick :)
			// Try get the existing_paths, and mutate it if it exists
			// Push returns the new length (guarenteed to be atleast 1 - truthy)
			// So if will only be false if the key doesn't exist
			if (!tag_paths_map.get(tag)?.push(source_file.path)) {
				tag_paths_map.set(tag, [source_file.path]);
			}
		});

		const tag_note_info = get_tag_note_info(
			plugin,
			source_cache?.frontmatter,
		);
		if (!tag_note_info.ok) {
			if (tag_note_info.error) tag_note_info.log("tag_note_info");

			return;
		}

		const { tag, field, exact, field_hierarchy } = tag_note_info.data;

		tag_notes.push({
			tag,
			exact,
			field,
			dir: field_hierarchy.dir,
			source_path: source_file.path,
			hierarchy_i: field_hierarchy.hierarchy_i,
		});
	});

	all_files.dataview?.forEach((page) => {
		const source_file = page.file;

		// NOTE: Problem, Dataview unwinds nested tags...
		// So if a note only has #foo/bar, we'll get #foo and #foo/bar here
		source_file.tags.values.forEach((tag) => {
			if (!tag_paths_map.get(tag)?.push(source_file.path)) {
				tag_paths_map.set(tag, [source_file.path]);
			}
		});

		const tag_note_info = get_tag_note_info(plugin, page);
		if (!tag_note_info.ok) {
			if (tag_note_info.error) tag_note_info.log("tag_note_info");

			return;
		}

		const { tag, field, exact, field_hierarchy } = tag_note_info.data;

		tag_notes.push({
			tag,
			exact,
			field,
			dir: field_hierarchy.dir,
			source_path: source_file.path,
			hierarchy_i: field_hierarchy.hierarchy_i,
		});
	});

	const tag_path_keys = [...tag_paths_map.keys()];

	tag_notes.forEach((tag_note) => {
		// Here we implement optional "sub-tag" support
		// If the tag-note-tag is #foo, and a target note has the tag #foo/bar, then we add an edge
		const target_paths = tag_note.exact
			? tag_paths_map.get(tag_note.tag)
			: tag_path_keys
					.filter((tag) => tag.startsWith(tag_note.tag))
					// We know that the tag_note.tag is in the tag_paths_map, so this is safe
					.flatMap((tag) => tag_paths_map.get(tag)!);

		target_paths?.forEach((target_path) => {
			graph.addDirectedEdge(tag_note.source_path, target_path, {
				explicit: true,
				dir: tag_note.dir,
				source: "tag_note",
				field: tag_note.field,
				hierarchy_i: tag_note.hierarchy_i,
			});
		});
	});

	return graph;
};
