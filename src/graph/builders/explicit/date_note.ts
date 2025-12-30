import { DateTime } from "luxon";
import type {
	EdgeBuilderResults,
	ExplicitEdgeBuilder,
} from "src/interfaces/graph";
import { Paths } from "src/utils/paths";
import { GCEdgeData, GCNodeData } from "wasm/pkg/breadcrumbs_graph_wasm";

// TODO: Option to point up to month, (and for month to point up to year?)

export const _add_explicit_edges_date_note: ExplicitEdgeBuilder = (
	plugin,
	all_files,
) => {
	const results: EdgeBuilderResults = { nodes: [], edges: [], errors: [] };

	const date_note_settings = plugin.settings.explicit_edge_sources.date_note;
	if (!date_note_settings.enabled) {
		return results;
	} else if (
		!plugin.settings.edge_fields.find(
			(field) => field.label === date_note_settings.default_field,
		)
	) {
		results.errors.push({
			code: "invalid_setting_value",
			path: "explicit_edge_sources.date_note.default_field",
			message: `The default Date Note field "${date_note_settings.default_field}" is not a valid Breadcrumbs Edge field`,
		});

		return results;
	}

	const date_notes: {
		ext: string;
		path: string;
		folder: string;
		basename: string;
		date: DateTime<true>;
	}[] = [];

	// Basically just converting the two all_files into a common format of their basic fields...
	// Maybe generalise this?
	all_files.obsidian?.forEach(({ file }) => {
		const date = DateTime.fromFormat(
			file.basename,
			date_note_settings.date_format,
		);
		if (!date.isValid) return;

		date_notes.push({
			date,
			path: file.path,
			ext: file.extension,
			basename: file.basename,
			// Not sure why would this be undefined?
			//   I tested and a file in the root of the vault still has a parent
			//   _it's_ parent is null, but that only happens if "file" is actually a folder
			folder: file.parent?.path ?? "",
		});
	});

	all_files.dataview?.forEach(({ file }) => {
		const date = DateTime.fromFormat(
			file.name,
			date_note_settings.date_format,
		);
		if (!date.isValid) return;

		date_notes.push({
			date,
			ext: file.ext,
			path: file.path,
			folder: file.folder,
			basename: file.name,
		});
	});

	date_notes
		.sort((a, b) => a.date.toMillis() - b.date.toMillis())
		.forEach((date_note, i) => {
			const basename_plus_one_day = date_note.date
				.plus({ days: 1 })
				.toFormat(date_note_settings.date_format);

			const target_basename = date_note_settings.stretch_to_existing
				? (date_notes.at(i + 1)?.basename ?? basename_plus_one_day)
				: basename_plus_one_day;

			const target_id = Paths.build(
				date_note.folder,
				target_basename,
				date_note.ext,
			);

			// NOTE: We have a full path, so we can go straight to the file without the given source_path
			const target_file = plugin.app.vault.getFileByPath(target_id);
			if (!target_file) {
				results.nodes.push(
					new GCNodeData(target_id, [], false, false, false),
				);
			}

			results.edges.push(
				new GCEdgeData(
					date_note.path,
					target_id,
					date_note_settings.default_field,
					"date_note",
				),
			);
		});

	return results;
};
