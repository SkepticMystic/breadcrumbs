import { META_FIELD } from "src/const/metadata_fields";
import type {
	BreadcrumbsError,
	ExplicitEdgeBuilder,
} from "src/interfaces/graph";
import type BreadcrumbsPlugin from "src/main";
import { get_field_hierarchy } from "src/utils/hierarchies";
import { fail, graph_build_fail, succ } from "src/utils/result";

const get_regex_note_info = (
	plugin: BreadcrumbsPlugin,
	metadata: Record<string, unknown> | undefined,
	path: string,
) => {
	if (!metadata) {
		return fail(undefined);
	}

	// NOTE: Check for a regex first, then the field, since there may be a default and we would do more work than necessary before failing if there is no regex
	const regex_str = metadata[META_FIELD["regex-note-regex"]];
	if (!regex_str) {
		return fail(undefined);
	} else if (typeof regex_str !== "string") {
		return graph_build_fail({
			path,
			code: "invalid_field_value",
			message: "regex-note-regex is not a string",
		});
	}

	let regex: RegExp;
	try {
		regex = new RegExp(regex_str);
		console.log(path, "regex: ", regex);
	} catch (e) {
		return graph_build_fail({
			path,
			code: "invalid_field_value",
			message: `regex-note-regex is not a valid regex: ${regex_str}`,
		});
	}

	const field =
		metadata[META_FIELD["regex-note-field"]] ??
		plugin.settings.explicit_edge_sources.regex_note.default_field;

	if (!field) {
		return fail(undefined);
	} else if (typeof field !== "string") {
		return graph_build_fail({
			path,
			code: "invalid_field_value",
			message: "regex-note-field is not a string",
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
			message: `regex-note-field is not a valid BC field: '${field}'`,
		});
	}

	return succ({
		field,
		regex,
		dir: field_hierarchy.dir,
		hierarchy_i: field_hierarchy.hierarchy_i,
	});
};

export const _add_explicit_edges_regex_note: ExplicitEdgeBuilder = (
	graph,
	plugin,
	all_files,
) => {
	const errors: BreadcrumbsError[] = [];

	const regex_note_files: {
		path: string;
		info: Extract<
			ReturnType<typeof get_regex_note_info>,
			{ ok: true }
		>["data"];
	}[] = [];

	// Basically just converting the two all_files into a common format of their basic fields...
	// Maybe generalise this?
	all_files.obsidian?.forEach(({ file, cache }) => {
		const info = get_regex_note_info(plugin, cache?.frontmatter, file.path);
		if (!info.ok) {
			if (info.error) errors.push(info.error);
			return;
		}

		regex_note_files.push({ info: info.data, path: file.path });
	});

	all_files.dataview?.forEach((page) => {
		const { file } = page;
		const info = get_regex_note_info(plugin, page, file.path);
		if (!info.ok) {
			if (info.error) errors.push(info.error);
			return;
		}

		regex_note_files.push({ info: info.data, path: file.path });
	});

	// Return early before bringing all nodes into memory
	if (!regex_note_files) return { errors };

	const nodes = graph.mapNodes((id) => id);

	regex_note_files.forEach((regex_note) => {
		nodes
			.filter((node) => regex_note.info.regex.test(node))
			.forEach((target_path) => {
				// NOTE: We don't need to safe_add_nodes because the list of possible targets is already from the graph

				graph.safe_add_directed_edge(regex_note.path, target_path, {
					explicit: true,
					source: "regex_note",
					dir: regex_note.info.dir,
					field: regex_note.info.field,
					hierarchy_i: regex_note.info.hierarchy_i,
				});
			});
	});

	return { errors };
};
