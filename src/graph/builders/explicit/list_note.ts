import { Notice } from "obsidian";
import { META_ALIAS } from "src/const/metadata_fields";
import type { IDataview } from "src/external/dataview/interfaces";
import type { BCGraph } from "src/graph/MyMultiGraph";
import type {
	BreadcrumbsError,
	ExplicitEdgeBuilder,
} from "src/interfaces/graph";
import type BreadcrumbsPlugin from "src/main";
import { resolve_relative_target_path } from "src/utils/obsidian";
import { fail, graph_build_fail, succ } from "src/utils/result";

const get_list_note_info = (
	plugin: BreadcrumbsPlugin,
	metadata: Record<string, unknown> | undefined,
	path: string,
) => {
	if (!metadata) {
		return fail(undefined);
	}

	const field = metadata[META_ALIAS["list-note-field"]];
	if (!field) {
		return fail(undefined);
	} else if (typeof field !== "string") {
		return graph_build_fail({
			path,
			code: "invalid_field_value",
			message: `list-note-field is not a string: '${field}'`,
		});
	} else if (!plugin.settings.edge_fields.find((f) => f.label === field)) {
		return graph_build_fail({
			path,
			code: "invalid_field_value",
			message: `list-note-field is not a valid BC field: '${field}'`,
		});
	}

	const neighbour_field =
		metadata[META_ALIAS["list-note-neighbour-field"]] ??
		plugin.settings.explicit_edge_sources.list_note.default_neighbour_field;

	if (neighbour_field) {
		if (typeof neighbour_field !== "string") {
			return graph_build_fail({
				path,
				code: "invalid_field_value",
				message: `list-note-neighbour-field is not a string: '${neighbour_field}'`,
			});
		} else if (
			!plugin.settings.edge_fields.find(
				(f) => f.label === neighbour_field,
			)
		) {
			return graph_build_fail({
				path,
				code: "invalid_field_value",
				message: `list-note-neighbour-field is not a valid BC field: '${neighbour_field}'`,
			});
		}
	}

	// TODO: Doesn't this just do what BC-ignore-out-edges does?
	// UPDATE: No, list-note-exclude-index ignores-out-edges, but _only for list-notes_
	const exclude_index = Boolean(
		metadata[META_ALIAS["list-note-exclude-index"]],
	);

	return succ({
		field,
		exclude_index,
		neighbour_field: (neighbour_field ?? undefined) as string | undefined,
	});
};

// Fortmat: `field [[note]]` (no -+* prefix)
// NOTE: The char ranges in the capture group need to align with the allowed chars in a BC field
const FIELD_OVERRIDE_REGEX = /^\s*([-\w\s]+)\b/;

/** Check if a given list item tries to override the note's list-note field.
 * If it does, resolve the field and return it. If not, return the default field (or undefined to indicate to use the default).
 */
const resolve_field_override = (
	plugin: BreadcrumbsPlugin,
	list_item: IDataview.NoteList,
	path: string,
) => {
	const field = list_item.text.match(FIELD_OVERRIDE_REGEX)?.[1];

	// No override, use the list_note_info field
	if (!field) {
		return succ(undefined);
	} else if (!plugin.settings.edge_fields.find((f) => f.label === field)) {
		return graph_build_fail({
			path,
			code: "invalid_field_value",
			message: `Field override is not a valid BC field: ${field}. Line: ${list_item.position.start.line}`,
		});
	} else {
		return succ({ field });
	}
};

/** If a few conditions are met, add an edge from the current list item to the _next_ one on the same level */
const handle_neighbour_list_item = ({
	graph,
	plugin,
	source_path,
	list_note_page,
	list_note_info,
	source_list_item_i,
}: {
	graph: BCGraph;
	source_path: string;
	plugin: BreadcrumbsPlugin;
	source_list_item_i: number;
	list_note_page: IDataview.Page;
	list_note_info: Extract<
		ReturnType<typeof get_list_note_info>,
		{ ok: true }
	>;
}) => {
	// Already checked outside, but this makes TS happy
	if (!list_note_info.data.neighbour_field) return;

	// NOTE: Known to exist, since we wouldn't have reached this function if it didn't
	const source_list_item =
		list_note_page.file.lists.values[source_list_item_i];

	// Not only do I need to find the next one on the same level,
	// But I also need to make sure there isn't a higher-level list item in between
	// e.g.
	// - A
	//   - B
	//   - C
	// - D
	//   - E
	//
	// If I'm at B, I need to find C, but not D

	let neighbour_list_item: IDataview.NoteList | undefined;
	for (
		let i = source_list_item_i + 1;
		i < list_note_page.file.lists.values.length;
		i++
	) {
		const item = list_note_page.file.lists.values[i];

		if (item.position.start.col < source_list_item.position.start.col) {
			break;
		} else if (
			item.position.start.col === source_list_item.position.start.col
		) {
			neighbour_list_item = item;
			break;
		}
	}
	if (!neighbour_list_item) return;

	const neighbour_link = neighbour_list_item.outlinks.at(0);
	if (!neighbour_link) return;

	const [path, file] = resolve_relative_target_path(
		plugin.app,
		neighbour_link.path,
		list_note_page.file.path,
	);

	if (!file) {
		graph.safe_add_node(path, { resolved: false });
	}

	// NOTE: Currently no support for field overrides for neighbour-fields
	graph.safe_add_directed_edge(source_path, path, {
		explicit: true,
		source: "list_note",
		field: list_note_info.data.neighbour_field,
	});
};

export const _add_explicit_edges_list_note: ExplicitEdgeBuilder = (
	graph,
	plugin,
	all_files,
) => {
	const errors: BreadcrumbsError[] = [];

	all_files.obsidian?.forEach(
		({ file: list_note_file, cache: list_note_cache }) => {
			if (!list_note_cache) return;

			const list_note_info = get_list_note_info(
				plugin,
				list_note_cache?.frontmatter,
				list_note_file.path,
			);
			if (!list_note_info.ok) {
				if (list_note_info.error) errors.push(list_note_info.error);
				return;
			} else {
				new Notice(
					"list-notes are not implemented without Dataview enabled",
				);
			}

			// TODO: Gonna have to read the contents of the file and parse it pretty manually...
			// Dataview is much easier in this case
			// list_note_cache?.listItems?.forEach((list_item) => {
			// 	list_item
			// });
		},
	);

	all_files.dataview?.forEach((list_note_page) => {
		const list_note_info = get_list_note_info(
			plugin,
			list_note_page,
			list_note_page.file.path,
		);
		if (!list_note_info.ok) {
			if (list_note_info.error) errors.push(list_note_info.error);
			return;
		}

		// There are two possible approaches here. Dataview represents the list both flat and recursively
		// 1. We could write some fancy recursive function to handle each item and its children
		// 2. We could just loop over each "list", treating it as a list item with one level of children
		list_note_page.file.lists.values.forEach(
			(source_list_item, source_list_item_i) => {
				// If there are no links on the line, ignore it.
				const source_link = source_list_item.outlinks.at(0);
				if (!source_link) return;

				const [source_path, source_file] = resolve_relative_target_path(
					plugin.app,
					source_link.path,
					list_note_page.file.path,
				);

				// The node wouldn't have been added in the simple_loop if it wasn't resolved.
				if (!source_file) {
					graph.safe_add_node(source_path, { resolved: false });
				}

				// Then, add the edge from the list_note itself, to the top-level list_items (if it's not excluded)
				// This works for all top-level list-items, not just the first :)
				if (
					!list_note_info.data.exclude_index &&
					source_list_item.position.start.col === 0
				) {
					// Override top-level field
					const source_override_field = resolve_field_override(
						plugin,
						source_list_item,
						list_note_page.file.path,
					);

					if (!source_override_field.ok) {
						if (source_override_field.error) {
							errors.push(source_override_field.error);
						}
						return;
					}

					graph.safe_add_directed_edge(
						list_note_page.file.path,
						source_path,
						{
							explicit: true,
							source: "list_note",
							field:
								source_override_field.data?.field ??
								list_note_info.data.field,
						},
					);
				}

				// NOTE: The logic of this function is _just_ complicated enough to warrent a separate function
				// to prevent multiple levels of if statement nesting
				if (list_note_info.data.neighbour_field) {
					handle_neighbour_list_item({
						graph,
						plugin,
						source_path,
						list_note_info,
						list_note_page,
						source_list_item_i,
					});
				}
				source_list_item.children.forEach((target_list_item) => {
					const target_link = target_list_item.outlinks.at(0);
					if (!target_link) return;

					const target_override_field = resolve_field_override(
						plugin,
						target_list_item,
						list_note_page.file.path,
					);

					if (!target_override_field.ok) {
						if (target_override_field.error) {
							errors.push(target_override_field.error);
						}
						return;
					}

					const [target_path, target_file] =
						resolve_relative_target_path(
							plugin.app,
							target_link.path,
							list_note_page.file.path,
						);

					// It's redundant, but easier to just safe_add_node here on the target
					// Technically, the next iteration of page.file.lists will add it (as a source)
					// But then I'd need to break up the iteration to first gather all sources, then handle the targets
					// This way we can guarentee the target exists
					if (!target_file) {
						graph.safe_add_node(target_path, { resolved: false });
					}

					graph.safe_add_directed_edge(source_path, target_path, {
						explicit: true,
						source: "list_note",
						field:
							target_override_field.data?.field ??
							list_note_info.data.field,
					});
				});
			},
		);
	});

	return { errors };
};
