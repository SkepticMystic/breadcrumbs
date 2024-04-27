import { META_ALIAS } from "src/const/metadata_fields";
// import type { BCGraph } from "src/graph/MyMultiGraph";
import type {
	BreadcrumbsError,
	EdgeBuilderResults,
	ExplicitEdgeBuilder,
} from "src/interfaces/graph";
import type BreadcrumbsPlugin from "src/main";
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
	} else if (!plugin.settings.edge_fields.find((f) => f.label === field)) {
		return graph_build_fail({
			path,
			code: "invalid_field_value",
			message: `johnny-decimal-note-field is not a valid BC field: '${field}'`,
		});
	}

	return succ({ field });
};

/** Take in the info of a johnny_decimal note.
 * Get the field info from the note or default settings
 * Add the directed edge to the target
 */
const handle_johnny_decimal_note = (
	plugin: BreadcrumbsPlugin,
	results: EdgeBuilderResults,
	source_note: JohnnyDecimalNote,
	notes: JohnnyDecimalNote[],
) => {
	const johnny_decimal_note_info = get_johnny_decimal_note_info(
		plugin,
		source_note.metadata,
		source_note.path,
	);
	if (!johnny_decimal_note_info.ok) {
		if (johnny_decimal_note_info.error) {
			results.errors.push(johnny_decimal_note_info.error);
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
		results.nodes.push({ id: target_note.path, attr: { resolved: false } });
	}

	const { field } = johnny_decimal_note_info.data;

	results.edges.push({
		source_id: source_note.path,
		target_id: target_note.path,
		attr: {
			field,
			explicit: true,
			source: "johnny_decimal_note",
		}
	});
};

type JohnnyDecimalNote = {
	path: string;
	basename: string;
	decimals: string;
	metadata?: Record<string, unknown>;
};

export const _add_explicit_edges_johnny_decimal_note: ExplicitEdgeBuilder = (
	plugin,
	all_files,
) => {
	const results: EdgeBuilderResults = { nodes: [], edges: [], errors: [] }

	if (!plugin.settings.explicit_edge_sources.johnny_decimal_note.enabled) {
		return results
	}

	const { delimiter } =
		plugin.settings.explicit_edge_sources.johnny_decimal_note;

	// This regex is actually less strict than the real Johnny Decimal system
	// Match a delimiter-separated list of chars and nums, followed by a space or the delimiter at the end
	const regex = new RegExp(`^([\\w\\d\\${delimiter}]+)(\\s|\\${delimiter}$)`);

	const johnny_decimal_notes: JohnnyDecimalNote[] = [];

	all_files.obsidian?.forEach(({ file, cache }) => {
		const basename = Paths.basename(file.path);

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
		const basename = Paths.basename(page.file.path);

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
			results,
			note,
			johnny_decimal_notes,
		);
	});

	return results
};
