import { META_ALIAS } from "src/const/metadata_fields";
import type { BCGraph } from "src/graph/MyMultiGraph";
import type {
	BreadcrumbsError,
	ExplicitEdgeBuilder,
} from "src/interfaces/graph";
import type BreadcrumbsPlugin from "src/main";
import { get_field_hierarchy } from "src/utils/hierarchies";
import { Paths } from "src/utils/paths";
import { fail, graph_build_fail, succ } from "src/utils/result";
import { ensure_not_ends_with } from "src/utils/strings";

const get_johnny_decimal_note_info = (
	plugin: BreadcrumbsPlugin,
	metadata: Record<string, unknown> | undefined,
	path: string,
) => {
	// NOTE: Don't return early here. Johnny Decimal notes can be valid without any metadata in them
	//   We just have to iterate and check each note
	// if (!metadata) return fail(undefined);

	const field =
		metadata?.[META_ALIAS["johnny-decimal-note-field"]] ??
		//   Which is why we have a default_field on johnny_decimal_note
		plugin.settings.explicit_edge_sources.johnny_decimal_note.default_field;

	if (!field) {
		return fail(undefined);
	} else if (typeof field !== "string") {
		return graph_build_fail({
			path,
			code: "invalid_field_value",
			message: `johnny-decimal-note-field is not a string: '${field}'`,
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
			message: `johnny-decimal-note-field is not a valid BC field: '${field}'`,
		});
	}

	return succ({ field, field_hierarchy });
};

/** Take in the info of a johnny_decimal note.
 * Get the field info from the note or default settings
 * Add the directed edge to the target
 */
const handle_johnny_decimal_note = (
	plugin: BreadcrumbsPlugin,
	graph: BCGraph,
	source_note: JohnnyDecimalNote,
	notes: JohnnyDecimalNote[],
	errors: BreadcrumbsError[],
) => {
	const johnny_decimal_note_info = get_johnny_decimal_note_info(
		plugin,
		source_note.metadata,
		source_note.path,
	);
	if (!johnny_decimal_note_info.ok) {
		if (johnny_decimal_note_info.error) {
			errors.push(johnny_decimal_note_info.error);
		}
		return;
	}

	const { delimiter } =
		plugin.settings.explicit_edge_sources.johnny_decimal_note;

	// Go one note up
	const target_decimals = source_note.decimals
		.split(delimiter)
		.slice(0, -1)
		.join(delimiter);
	if (target_decimals === "") return;

	const target_note = notes.find((n) => n.decimals === target_decimals);
	// I thought a while about building the unresolved path in this case.
	// But I don't know what the _rest_ of the basename would be. It's not just the decimals
	if (!target_note) return;

	// target_path is now a full path, so we can check for it directly, instead of getFirstLinkpathDest
	const target_file = plugin.app.vault.getFileByPath(target_note.path);

	// NOTE: I don't think this can ever happen... if target_note, then target_file must exist
	if (!target_file) {
		graph.safe_add_node(target_note.path, { resolved: false });
	}

	const { field, field_hierarchy } = johnny_decimal_note_info.data;

	graph.safe_add_directed_edge(source_note.path, target_note.path, {
		field,
		explicit: true,
		dir: field_hierarchy.dir,
		source: "johnny_decimal_note",
		hierarchy_i: field_hierarchy.hierarchy_i,
	});
};

type JohnnyDecimalNote = {
	path: string;
	basename: string;
	decimals: string;
	metadata?: Record<string, unknown>;
};

export const _add_explicit_edges_johnny_decimal_note: ExplicitEdgeBuilder = (
	graph,
	plugin,
	all_files,
) => {
	const errors: BreadcrumbsError[] = [];

	if (!plugin.settings.explicit_edge_sources.johnny_decimal_note.enabled) {
		return { errors };
	}

	const { delimiter } =
		plugin.settings.explicit_edge_sources.johnny_decimal_note;

	// This regex is actually less strict than the real Johnny Decimal system
	// Match a delimiter-separated list of chars and nums, followed by a space or the delimiter at the end
	const regex = new RegExp(`^([\\w\\d\\${delimiter}]+)(\\s|\\${delimiter}$)`);

	const johnny_decimal_notes: JohnnyDecimalNote[] = [];

	all_files.obsidian?.forEach(({ file, cache }) => {
		const basename = Paths.drop_ext(Paths.basename(file.path));

		const decimals = basename.match(regex)?.[1];
		if (!decimals) return;

		johnny_decimal_notes.push({
			basename,
			path: file.path,
			metadata: cache?.frontmatter,
			decimals: ensure_not_ends_with(decimals, delimiter),
		});
	});

	all_files.dataview?.forEach((page) => {
		const basename = Paths.drop_ext(Paths.basename(page.file.path));

		const decimals = basename.match(regex)?.[1];
		if (!decimals) return;

		johnny_decimal_notes.push({
			basename,
			metadata: page,
			path: page.file.path,
			decimals: ensure_not_ends_with(decimals, delimiter),
		});
	});

	johnny_decimal_notes.forEach((note) => {
		handle_johnny_decimal_note(
			plugin,
			graph,
			note,
			johnny_decimal_notes,
			errors,
		);
	});

	return { errors };
};
