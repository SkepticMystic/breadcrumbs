import { META_ALIAS } from "src/const/metadata_fields";
import type {
	EdgeBuilderResults,
	ExplicitEdgeBuilder,
} from "src/interfaces/graph";
import { log } from "src/logger";
import type BreadcrumbsPlugin from "src/main";
import { fail, graph_build_fail, succ } from "src/utils/result";
import { ensure_starts_with } from "src/utils/strings";

const get_tag_note_info = (
	plugin: BreadcrumbsPlugin,
	metadata: Record<string, unknown> | undefined,
	path: string,
) => {
	if (!metadata) return fail(undefined);

	let raw_tag = metadata[META_ALIAS["tag-note-tag"]];
	if (!raw_tag) {
		raw_tag = metadata["BC-tag-note"];

		if (raw_tag) {
			log.warn(
				`'BC-tag-note' is deprecated in favor of ${META_ALIAS["tag-note-tag"]}`,
			);
		}
	}

	if (!raw_tag) {
		return fail(undefined);
	} else if (typeof raw_tag !== "string") {
		return graph_build_fail({
			path,
			code: "invalid_field_value",
			message: `tag-note-tag is not a string: '${raw_tag}'`,
		});
	}
	const tag = ensure_starts_with(raw_tag, "#");

	const field =
		metadata[META_ALIAS["tag-note-field"]] ??
		plugin.settings.explicit_edge_sources.tag_note.default_field;

	if (!field) {
		return fail(undefined);
	} else if (typeof field !== "string") {
		return graph_build_fail({
			path,
			code: "invalid_field_value",
			message: `tag-note-field is not a string: '${field}'`,
		});
	} else if (!plugin.settings.edge_fields.find((f) => f.label === field)) {
		return graph_build_fail({
			path,
			code: "invalid_field_value",
			message: `tag-note-field is not a valid BC field: '${field}'`,
		});
	}

	const exact = Boolean(metadata[META_ALIAS["tag-note-exact"]]);

	return succ({ tag, field, exact });
};

export const _add_explicit_edges_tag_note: ExplicitEdgeBuilder = (
	plugin,
	all_files,
) => {
	const results: EdgeBuilderResults = { nodes: [], edges: [], errors: [], }

	// More efficient than quadratic looping over all_files,
	// We gather the tag_notes, and the tags the each note has in one go
	const tag_notes: {
		tag: string;
		field: string;
		exact: boolean;
		source_path: string;
	}[] = [];

	// From tag, to paths with that tag
	const tag_paths_map = new Map<string, string[]>();

	all_files.obsidian?.forEach(
		({ file: tag_note_file, cache: tag_note_cache }) => {
			if (!tag_note_cache) return;

			// Check if the tag_note itself has any tags for other tags notes
			tag_note_cache?.tags?.forEach(({ tag }) => {
				// Quite happy with this trick :)
				// Try get the existing_paths, and mutate it if it exists
				// Push returns the new length (guarenteed to be atleast 1 - truthy)
				// So it will only be false if the key doesn't exist
				if (!tag_paths_map.get(tag)?.push(tag_note_file.path)) {
					tag_paths_map.set(tag, [tag_note_file.path]);
				}
			});

			const tag_note_info = get_tag_note_info(
				plugin,
				tag_note_cache?.frontmatter,
				tag_note_file.path,
			);
			if (!tag_note_info.ok) {
				if (tag_note_info.error) results.errors.push(tag_note_info.error);
				return;
			}

			const { tag, field, exact } = tag_note_info.data;

			tag_notes.push({
				tag,
				exact,
				field,
				source_path: tag_note_file.path,
			});
		},
	);

	all_files.dataview?.forEach((page) => {
		const tag_note_file = page.file;

		// NOTE: We make sure to use etags, not tags (which are unwound)
		tag_note_file.etags.values.forEach((tag) => {
			if (!tag_paths_map.get(tag)?.push(tag_note_file.path)) {
				tag_paths_map.set(tag, [tag_note_file.path]);
			}
		});

		const tag_note_info = get_tag_note_info(
			plugin,
			page,
			tag_note_file.path,
		);
		if (!tag_note_info.ok) {
			if (tag_note_info.error) results.errors.push(tag_note_info.error);
			return;
		}
		const { tag, field, exact } = tag_note_info.data;

		tag_notes.push({
			tag,
			exact,
			field,
			source_path: tag_note_file.path,
		});
	});

	const all_tags = [...tag_paths_map.keys()];

	tag_notes.forEach((tag_note) => {
		// Here we implement optional "sub-tag" support
		// If the tag-note-tag is #foo, and a target note has the tag #foo/bar, then we add an edge
		const target_paths = tag_note.exact
			? tag_paths_map.get(tag_note.tag)
			: all_tags
				.filter((tag) => tag.startsWith(tag_note.tag))
				// We know that the tag_note.tag is in the tag_paths_map, so this is safe
				.flatMap((tag) => tag_paths_map.get(tag)!);

		// Adding these edges is comparatively simple.
		//   We know the target_path is resolved, since it only gets added to the map
		//   if it's a resolved note with a tag in it
		target_paths?.forEach((target_path) => {
			results.edges.push({
				source_id: tag_note.source_path,
				target_id: target_path,
				attr: {
					explicit: true,
					source: "tag_note",
					field: tag_note.field,
				}
			})
		});
	});

	return results
};
