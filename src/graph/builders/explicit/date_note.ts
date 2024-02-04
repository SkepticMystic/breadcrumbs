import { DateTime } from "luxon";
import path from "path";
import type {
	BreadcrumbsError,
	ExplicitEdgeBuilder,
} from "src/interfaces/graph";
import { get_field_hierarchy } from "src/utils/hierarchies";

export const _add_explicit_edges_date_note: ExplicitEdgeBuilder = (
	graph,
	plugin,
	all_files,
) => {
	const errors: BreadcrumbsError[] = [];

	const date_note_settings = plugin.settings.explicit_edge_sources.date_note;
	if (!date_note_settings.enabled) return { errors };

	const field_hierarchy = get_field_hierarchy(
		plugin.settings.hierarchies,
		date_note_settings.default_field,
	);
	if (!field_hierarchy) {
		errors.push({
			code: "invalid_setting_value",
			message: `date_note.default_field is not a valid BC field: '${date_note_settings.default_field}'`,
			path: "",
		});

		return { errors };
	}

	const date_note_files: {
		ext: string;
		path: string;
		folder: string;
		basename: string;
	}[] = [];

	// Basically just converting the two all_files into a common format of their basic fields...
	// Maybe generalise this?
	all_files.obsidian?.forEach(({ file }) => {
		date_note_files.push({
			ext: file.extension,
			path: file.path,
			basename: file.basename,
			// TODO: Why would this be undefined?
			folder: file.parent?.path ?? "",
		});
	});

	all_files.dataview?.forEach((date_note_page) => {
		const file = date_note_page.file;

		date_note_files.push({
			ext: file.ext,
			path: file.path,
			basename: file.name,
			folder: file.folder,
		});
	});

	date_note_files.forEach((file) => {
		const date = DateTime.fromFormat(
			file.basename,
			date_note_settings.date_format,
		);
		if (!date.isValid) return;

		// If the date could be _parsed_, then it should be able to be _formatted_
		const next_basename = date
			.plus({ days: 1 })
			.toFormat(date_note_settings.date_format);

		// TODO: Make sure this doesn't add a leading / for root files
		const next_path =
			path.join(file.folder, next_basename) + `.${file.ext}`;

		// TODO: I needed to use this instead of getFirstLinkpathDest, since next_path is a full path,
		// and we don't want to match a potentnial relative path
		// This may need to be changed on other builders
		const next_file = plugin.app.vault.getAbstractFileByPath(next_path);

		if (!next_file) {
			graph.safe_add_node(next_path, { resolved: false });
		}

		graph.addDirectedEdge(file.path, next_path, {
			explicit: true,
			source: "date_note",
			dir: field_hierarchy.dir,
			field: date_note_settings.default_field,
			hierarchy_i: field_hierarchy.hierarchy_i,
		});
	});

	return { errors };
};
