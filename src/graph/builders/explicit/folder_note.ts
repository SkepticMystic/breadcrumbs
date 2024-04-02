import type { Direction } from "src/const/hierarchies";
import { META_ALIAS } from "src/const/metadata_fields";
import type {
	BreadcrumbsError,
	ExplicitEdgeBuilder,
} from "src/interfaces/graph";
import type { Result } from "src/interfaces/result";
import type BreadcrumbsPlugin from "src/main";
import { get_field_hierarchy } from "src/utils/hierarchies";
import { fail, graph_build_fail, succ } from "src/utils/result";

type FolderNoteData = {
	field: string;
	dir: Direction;
	recurse: boolean;
	hierarchy_i: number;
};

const get_folder_note_info = (
	plugin: BreadcrumbsPlugin,
	metadata: Record<string, unknown> | undefined,
	path: string,
): Result<FolderNoteData, BreadcrumbsError | undefined> => {
	if (!metadata) return fail(undefined);

	const field = metadata[META_ALIAS["folder-note-field"]];
	if (!field) {
		return fail(undefined);
	} else if (typeof field !== "string") {
		return graph_build_fail({
			path,
			code: "invalid_field_value",
			message: `folder-note-field is not a string: '${field}'`,
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
			message: `folder-note-field is not a valid BC field: '${field}'`,
		});
	}

	const recurse = Boolean(metadata[META_ALIAS["folder-note-recurse"]]);

	return succ({
		field,
		recurse,
		dir: field_hierarchy.dir,
		hierarchy_i: field_hierarchy.hierarchy_i,
	});
};

const iterate_folder_files = async (
	plugin: BreadcrumbsPlugin,
	folder: string,
	cb: (path: string) => void,
	/** Keep going for subfolders? Or just stop after the first folder */
	recurse: boolean,
) => {
	const folder_files = await plugin.app.vault.adapter.list(folder);

	// For each of the immediate children
	folder_files.files.forEach((path) => cb(path));

	if (recurse) {
		// For each of the folders, recurse
		await Promise.all(
			folder_files.folders.map((folder) =>
				// When the subfolder is recursed, what does it mean when the callback runs?
				// Where will it point up to? The initial folder's files point up to the folder_note
				// But the subfolders don't specify a folder_note
				// NOTE: For now, the subfiles will point up to the initial folder_note
				iterate_folder_files(plugin, folder, cb, true),
			),
		);
	}
};

export const _add_explicit_edges_folder_note: ExplicitEdgeBuilder = async (
	graph,
	plugin,
	all_files,
) => {
	const errors: BreadcrumbsError[] = [];

	const folder_notes: {
		file: { path: string; folder: string };
		data: FolderNoteData;
	}[] = [];

	all_files.obsidian?.forEach(
		({ file: folder_note_file, cache: folder_note_cache }) => {
			if (!folder_note_cache) return;

			const folder_note_info = get_folder_note_info(
				plugin,
				folder_note_cache?.frontmatter,
				folder_note_file.path,
			);
			if (!folder_note_info.ok) {
				if (folder_note_info.error) errors.push(folder_note_info.error);
				return;
			}

			folder_notes.push({
				data: folder_note_info.data,
				file: {
					path: folder_note_file.path,
					folder: folder_note_file.parent?.path ?? "",
				},
			});
		},
	);

	all_files.dataview?.forEach((folder_note_page) => {
		const folder_note_info = get_folder_note_info(
			plugin,
			folder_note_page,
			folder_note_page.file.path,
		);
		if (!folder_note_info.ok) {
			if (folder_note_info.error) errors.push(folder_note_info.error);
			return;
		}

		folder_notes.push({
			data: folder_note_info.data,
			file: {
				path: folder_note_page.file.path,
				folder: folder_note_page.file.folder,
			},
		});
	});

	await Promise.all(
		folder_notes.map(({ data, file: folder_note }) =>
			iterate_folder_files(
				plugin,
				folder_note.folder,
				(target_path) => {
					if (
						!target_path.endsWith(".md") ||
						target_path === folder_note.path
					)
						return;

					// We know path is resolved
					graph.safe_add_directed_edge(
						folder_note.path,
						target_path,
						{
							dir: data.dir,
							explicit: true,
							field: data.field,
							source: "folder_note",
							hierarchy_i: data.hierarchy_i,
						},
					);
				},
				data.recurse,
			),
		),
	);

	return { errors };
};
