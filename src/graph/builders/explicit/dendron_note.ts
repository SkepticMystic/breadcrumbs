import path from "path";
import { META_FIELD } from "src/const/metadata_fields";
import type { BCGraph } from "src/graph/MyMultiGraph";
import type {
	ExplicitEdgeBuilder,
	GraphBuildError,
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
	if (!metadata) {
		return fail(undefined);
	}

	const field =
		metadata[META_FIELD["dendron-note-field"]] ??
		plugin.settings.explicit_edge_sources.dendron_note.default_field;

	if (!field) {
		return fail(undefined);
	} else if (typeof field !== "string") {
		return graph_build_fail({
			path,
			code: "invalid_field_value",
			message: "dendron-note-field is not a string",
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
 * Get the field info from the note or default settings (TODO)
 * Add the directed edge to the target
 */
const handle_dendron_note = (
	plugin: BreadcrumbsPlugin,
	graph: BCGraph,
	source_path: string,
	source_metadata: Record<string, unknown> | undefined,
	errors: GraphBuildError[],
) => {
	const { delimiter } = plugin.settings.explicit_edge_sources.dendron_note;

	// NOTE: There are easier ways to do alot of the below.
	//   But the `file` type between obsidian and dataview doesn't have the common fields needed.
	//   So we rebuild from `path`
	// drop_ext, as the delimiter might be '.'
	const source_basename_splits = Paths.drop_ext(
		path.basename(source_path),
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

	// Go one note up
	const target_basename = source_basename_splits.slice(0, -1).join(delimiter);

	const target_folder_splits = source_path.split("/").slice(0, -1);
	const target_folder =
		// Check if it's in the root folder
		target_folder_splits.length === 0
			? // Nodes are added as their full path, but without the leading /
				""
			: target_folder_splits.join("/") + "/";

	const target_path = `${target_folder}${target_basename}${path.extname(source_path)}`;

	const target_file = plugin.app.metadataCache.getFirstLinkpathDest(
		target_path,
		source_path,
	);

	// TODO: If !target_file, we can recursively call handle_dendron_note
	//   To add the unresolved edges along the way

	graph.safe_add_node(target_path, { resolved: Boolean(target_file) });

	const { field, field_hierarchy } = dendron_note_info.data;
	graph.addDirectedEdge(source_path, target_path, {
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
	const errors: GraphBuildError[] = [];

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
