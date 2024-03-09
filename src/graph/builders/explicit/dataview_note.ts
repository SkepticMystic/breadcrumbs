import { Notice } from "obsidian";
import { META_FIELD } from "src/const/metadata_fields";
import { dataview_plugin } from "src/external/dataview/index";
import type { IDataview } from "src/external/dataview/interfaces";
import type {
	BreadcrumbsError,
	ExplicitEdgeBuilder,
} from "src/interfaces/graph";
import type BreadcrumbsPlugin from "src/main";
import { get_field_hierarchy } from "src/utils/hierarchies";
import { fail, graph_build_fail, succ } from "src/utils/result";

const get_dataview_note_info = (
	plugin: BreadcrumbsPlugin,
	metadata: Record<string, unknown> | undefined,
	path: string,
) => {
	if (!metadata) {
		return fail(undefined);
	}

	const query = metadata[META_FIELD["dataview-note-query"]];
	if (!query) {
		return fail(undefined);
	} else if (typeof query !== "string") {
		return graph_build_fail({
			path,
			code: "invalid_field_value",
			message: "dataview-note-query is not a string",
		});
	}
	// NOTE: We check that the query is actually valid later

	const field = metadata[META_FIELD["dataview-note-field"]];
	if (!field) {
		return fail(undefined);
	} else if (typeof field !== "string") {
		return graph_build_fail({
			path,
			code: "invalid_field_value",
			message: "dataview-note-field is not a string",
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
			message: `dataview-note-field is not a valid BC field: '${field}'`,
		});
	}

	return succ({
		field,
		query,
		dir: field_hierarchy.dir,
		hierarchy_i: field_hierarchy.hierarchy_i,
	});
};

export const _add_explicit_edges_dataview_note: ExplicitEdgeBuilder = (
	graph,
	plugin,
	all_files,
) => {
	console.log("dataview_notes");
	const errors: BreadcrumbsError[] = [];

	all_files.obsidian?.forEach(
		({ file: dataview_note_file, cache: dataview_note_cache }) => {
			if (!dataview_note_cache) return;

			const dataview_note_info = get_dataview_note_info(
				plugin,
				dataview_note_cache?.frontmatter,
				dataview_note_file.path,
			);
			if (!dataview_note_info.ok) {
				if (dataview_note_info.error)
					errors.push(dataview_note_info.error);
				return;
			} else {
				new Notice(
					"dataview-notes are not implemented without Dataview enabled",
				);
			}
		},
	);

	all_files.dataview?.forEach((dataview_note_page) => {
		const dataview_note_info = get_dataview_note_info(
			plugin,
			dataview_note_page,
			dataview_note_page.file.path,
		);
		if (!dataview_note_info.ok) {
			if (dataview_note_info.error) errors.push(dataview_note_info.error);
			return;
		}

		const { field, query, dir, hierarchy_i } = dataview_note_info.data;

		let pages: IDataview.Page[] = [];
		try {
			pages = dataview_plugin.get_api()!.pages(query)
				.values as IDataview.Page[];
		} catch (error) {
			console.log(error);
			return errors.push({
				code: "invalid_field_value",
				path: dataview_note_page.file.path,
				message: `dataview-note-query is not a valid dataview query: '${query}'`,
			});
		}

		pages.forEach((page) => {
			// NOTE: I _believe_ we don't need to even safe_add_node, since dv will only return resolved notes
			graph.safe_add_directed_edge(
				dataview_note_page.file.path,
				page.file.path,
				{
					dir,
					field,
					hierarchy_i,
					explicit: true,
					source: "dataview_note",
				},
			);
		});
	});

	return { errors };
};
