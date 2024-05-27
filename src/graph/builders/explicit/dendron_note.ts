import { META_ALIAS } from "src/const/metadata_fields";
// import type { BCGraph } from "src/graph/MyMultiGraph";
import type {
	EdgeBuilderResults,
	ExplicitEdgeBuilder,
} from "src/interfaces/graph";
import type BreadcrumbsPlugin from "src/main";
import { Paths } from "src/utils/paths";
import { fail, graph_build_fail, succ } from "src/utils/result";
import {
	GraphConstructionEdgeData,
	GraphConstructionNodeData,
} from "wasm/pkg/breadcrumbs_graph_wasm";

const get_dendron_note_info = (
	plugin: BreadcrumbsPlugin,
	metadata: Record<string, unknown> | undefined,
	path: string,
) => {
	// NOTE: Don't return early here. Dendron notes can be valid without any metadata in them
	//   We just have to iterate and check each note
	// if (!metadata) return fail(undefined);

	const field =
		metadata?.[META_ALIAS["dendron-note-field"]] ??
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
	} else if (!plugin.settings.edge_fields.find((f) => f.label === field)) {
		return graph_build_fail({
			path,
			code: "invalid_field_value",
			message: `dendron-note-field is not a valid field: '${field}'`,
		});
	}

	return succ({ field });
};

/** Take in the info of a _potential_ dendron note.
 * Check that it has the delimeter in it's basename
 * Get the field info from the note or default settings
 * Add the directed edge to the target
 */
const handle_dendron_note = (
	plugin: BreadcrumbsPlugin,
	results: EdgeBuilderResults,
	source_id: string,
	source_metadata: Record<string, unknown> | undefined,
) => {
	const { delimiter } = plugin.settings.explicit_edge_sources.dendron_note;

	// NOTE: There are easier ways to do alot of the below.
	//   But the `file` type between obsidian and dataview doesn't have the common fields needed.
	//   So we rebuild from `path`
	const source_basename_splits = Paths.basename(source_id).split(delimiter);
	if (source_basename_splits.length === 1) return;

	const dendron_note_info = get_dendron_note_info(
		plugin,
		source_metadata,
		source_id,
	);
	if (!dendron_note_info.ok) {
		if (dendron_note_info.error) {
			results.errors.push(dendron_note_info.error);
		}
		return;
	}

	const target_id = Paths.build(
		// Use the same folder as the source
		source_id.split("/").slice(0, -1).join("/"),
		// Go one note up
		source_basename_splits.slice(0, -1).join(delimiter),
		"md",
	);
	const { field } = dendron_note_info.data;

	// target_path is now a full path, so we can check for it directly, instead of getFirstLinkpathDest
	const target_file = plugin.app.vault.getFileByPath(target_id);

	if (!target_file) {
		results.nodes.push(
			new GraphConstructionNodeData(target_id, [], false, false, false),
		);

		// If !target_file, we can recursively call handle_dendron_note
		//   To add the unresolved edges along the way
		handle_dendron_note(
			plugin,
			results,
			target_id,
			// This is really quite elegant :)
			//   The unresolved note has no BC-dendron field, by definition
			//   Passing undefined would just use the settings.default field
			//   But we can propagate the field from the resolved source note
			{ [META_ALIAS["dendron-note-field"]]: field },
		);
	}

	results.edges.push(
		new GraphConstructionEdgeData(
			source_id,
			target_id,
			field,
			"dendron_note",
		),
	);
};

export const _add_explicit_edges_dendron_note: ExplicitEdgeBuilder = (
	plugin,
	all_files,
) => {
	const results: EdgeBuilderResults = { nodes: [], edges: [], errors: [] };

	if (!plugin.settings.explicit_edge_sources.dendron_note.enabled) {
		return results;
	}

	all_files.obsidian?.forEach(({ file, cache }) => {
		handle_dendron_note(plugin, results, file.path, cache?.frontmatter);
	});

	all_files.dataview?.forEach((page) => {
		handle_dendron_note(plugin, results, page.file.path, page);
	});

	return results;
};
