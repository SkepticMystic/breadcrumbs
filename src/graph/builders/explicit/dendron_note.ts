import { META_FIELD } from "src/const/metadata_fields";
import type { BCGraph } from "src/graph/MyMultiGraph";
import type {
	BreadcrumbsError,
	ExplicitEdgeBuilder,
} from "src/interfaces/graph";
import type BreadcrumbsPlugin from "src/main";
import { get_field_hierarchy } from "src/utils/hierarchies";
import { Paths } from "src/utils/paths";
import { fail, graph_build_fail, succ } from "src/utils/result";

const get_dendron_note_info = (
	plugin: BreadcrumbsPlugin,
	metadata: Record<string, unknown> | undefined,
	path: string,
) => {
	// NOTE: Don't return early here. Dendron notes can be valid without any metadata in them
	//   We just have to iterate and check each note
	// if (!metadata) return fail(undefined);

	const field =
		metadata?.[META_FIELD["dendron-note-field"]] ??
		//   Which is why we have a default_field on dendron_note
		plugin.settings.explicit_edge_sources.dendron_note.default_field;

	if (!field) {
		return fail(undefined);
	} else if (typeof field !== "string") {
		return graph_build_fail({
			path,
			code: "invalid_field_value",
			message: `dendron-note-field is not a string: '${field}'`,
		});
	}

	const field_hierarchy = get_field_hierarchy(
		plugin.settings.hierarchies,
		field,
	);
	if (!field_hierarchy) {
		return graph_build_fail({
			path,
			code: "invalid_field_value",
			message: `dendron-note-field is not a valid BC field: '${field}'`,
		});
	}

	return succ({ field, field_hierarchy });
};

/** Take in the info of a _potential_ dendron note.
 * Check that it has the delimeter in it's basename
 * Get the field info from the note or default settings
 * Add the directed edge to the target
 */
const handle_dendron_note = (
	plugin: BreadcrumbsPlugin,
	graph: BCGraph,
	source_path: string,
	source_metadata: Record<string, unknown> | undefined,
	errors: BreadcrumbsError[],
) => {
	const { delimiter } = plugin.settings.explicit_edge_sources.dendron_note;

	// NOTE: There are easier ways to do alot of the below.
	//   But the `file` type between obsidian and dataview doesn't have the common fields needed.
	//   So we rebuild from `path`
	// drop_ext, as the delimiter might be '.'
	const source_basename_splits = Paths.drop_ext(
		Paths.basename(source_path),
	).split(delimiter);
	if (source_basename_splits.length === 1) return;

	const dendron_note_info = get_dendron_note_info(
		plugin,
		source_metadata,
		source_path,
	);
	if (!dendron_note_info.ok) {
		if (dendron_note_info.error) {
			errors.push(dendron_note_info.error);
		}
		return;
	}

	const target_path = Paths.build(
		// Use the same folder as the source
		source_path.split("/").slice(0, -1).join("/"),
		// Go one note up
		source_basename_splits.slice(0, -1).join(delimiter),
		"md",
	);

	const { field, field_hierarchy } = dendron_note_info.data;

	// target_path is now a full path, so we can check for it directly, instead of getFirstLinkpathDest
	const target_file = plugin.app.vault.getFileByPath(target_path);

	if (!target_file) {
		graph.safe_add_node(target_path, { resolved: false });

		// If !target_file, we can recursively call handle_dendron_note
		//   To add the unresolved edges along the way
		handle_dendron_note(
			plugin,
			graph,
			target_path,
			// This is really quite elegant :)
			//   The unresolved note has no BC-dendron field, by definition
			//   Passing undefined would just use the settings.default field
			//   But we can propagate the field from the resolved source note, to stay in the same hierarchy
			{ [META_FIELD["dendron-note-field"]]: field },
			errors,
		);
	}

	graph.safe_add_directed_edge(source_path, target_path, {
		field,
		explicit: true,
		source: "dendron_note",
		dir: field_hierarchy.dir,
		hierarchy_i: field_hierarchy.hierarchy_i,
	});
};

export const _add_explicit_edges_dendron_note: ExplicitEdgeBuilder = (
	graph,
	plugin,
	all_files,
) => {
	const errors: BreadcrumbsError[] = [];

	if (!plugin.settings.explicit_edge_sources.dendron_note.enabled) {
		return { errors };
	}

	all_files.obsidian?.forEach(({ file, cache }) => {
		handle_dendron_note(
			plugin,
			graph,
			file.path,
			cache?.frontmatter,
			errors,
		);
	});

	all_files.dataview?.forEach((page) => {
		handle_dendron_note(plugin, graph, page.file.path, page, errors);
	});

	return { errors };
};
