import { Notice } from "obsidian";
import { META_FIELD } from "src/const/metadata_fields";
import type { IDataview } from "src/external/dataview/interfaces";
import type { BCGraph } from "src/graph/MyMultiGraph";
import type {
	BreadcrumbsError,
	ExplicitEdgeBuilder,
} from "src/interfaces/graph";
import type BreadcrumbsPlugin from "src/main";
import { get_field_hierarchy } from "src/utils/hierarchies";
import { Links } from "src/utils/links";
import { Paths } from "src/utils/paths";
import { fail, graph_build_fail, succ } from "src/utils/result";

const get_list_note_info = (
	plugin: BreadcrumbsPlugin,
	metadata: Record<string, unknown> | undefined,
	path: string,
) => {
	if (!metadata) {
		return fail(undefined);
	}

	const field = metadata[META_FIELD["list-note-field"]];
	if (!field) {
		return fail(undefined);
	} else if (typeof field !== "string") {
		return graph_build_fail({
			path,
			code: "invalid_field_value",
			message: "list-note-field is not a string",
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
			message: `list-note-field is not a valid BC field: '${field}'`,
		});
	}

	const next_field = metadata[META_FIELD["list-note-next-field"]];

	const next_field_hierarchy =
		next_field && typeof next_field === "string"
			? get_field_hierarchy(plugin.settings.hierarchies, next_field)
			: null;

	const exclude_index = Boolean(
		metadata[META_FIELD["list-note-exclude-index"]],
	);

	return succ({
		field,
		exclude_index,
		dir: field_hierarchy.dir,
		hierarchy_i: field_hierarchy.hierarchy_i,
		next: next_field_hierarchy
			? {
					field: next_field as string,
					dir: next_field_hierarchy.dir,
					hierarchy_i: next_field_hierarchy.hierarchy_i,
				}
			: undefined,
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
	const field_override = list_item.text.match(FIELD_OVERRIDE_REGEX)?.[1];
	// No override, use the list_note_info field
	if (!field_override) return succ(undefined);

	const resolved_field_hierarchy = get_field_hierarchy(
		plugin.settings.hierarchies,
		field_override,
	);

	if (!resolved_field_hierarchy) {
		return graph_build_fail({
			path,
			code: "invalid_field_value",
			message: `Field override is not a valid BC field: ${field_override}. Line: ${list_item.position.start.line}`,
		});
	}

	return succ({
		field: field_override,
		dir: resolved_field_hierarchy.dir,
		hierarchy_i: resolved_field_hierarchy.hierarchy_i,
	});
};

// TODO: Generalise this to accept the link path and the list_note_page.path instead
const process_list_item = ({
	plugin,
	list_item_link,
	list_note_page,
}: {
	plugin: BreadcrumbsPlugin;
	list_item_link: IDataview.Link;
	list_note_page: IDataview.Page;
}) => {
	const unsafe_path = Paths.ensure_ext(list_item_link.path);
	const file = plugin.app.metadataCache.getFirstLinkpathDest(
		list_item_link.path,
		list_note_page.file.path,
	);

	const path =
		file?.path ??
		Links.resolve_to_absolute_path(
			plugin.app,
			unsafe_path,
			// Still resolve from the list_note, not the source_note above the target
			list_note_page.file.path,
		);

	return [path, file] as const;
};

/** If a few conditions are met, add an edge from the current list item to the _next_ one on the same level */
const handle_next_list_item = ({
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
	const [source_list_item, next_list_item] = [
		// NOTE: Known to exist, since we wouldn't have reached this function if it didn't
		list_note_page.file.lists.values[source_list_item_i],
		list_note_page.file.lists.values.at(source_list_item_i + 1),
	];

	if (
		!next_list_item ||
		!list_note_info.data.next ||
		next_list_item.position.start.col !==
			source_list_item.position.start.col
	) {
		return;
	}

	const next_link = next_list_item.outlinks.at(0);
	if (!next_link) return;

	const [path, file] = process_list_item({
		plugin,
		list_note_page,
		list_item_link: next_link,
	});

	if (!file) {
		graph.safe_add_node(path, { resolved: false });
	}

	// NOTE: Currently no support for field overrides for next-fields
	graph.safe_add_directed_edge(source_path, path, {
		explicit: true,
		source: "list_note",
		dir: list_note_info.data.next.dir,
		field: list_note_info.data.next.field,
		hierarchy_i: list_note_info.data.next.hierarchy_i,
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

				const [source_path, source_file] = process_list_item({
					plugin,
					list_note_page,
					list_item_link: source_link,
				});

				// The node wouldn't have been added in the simple_loop if it wasn't resolved.
				//   NOTE: Don't just use graph.addNode though. A different GraphBuilder may have added it.
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
					const source_field_hierarchy = resolve_field_override(
						plugin,
						source_list_item,
						list_note_page.file.path,
					);

					if (!source_field_hierarchy.ok) {
						if (source_field_hierarchy.error) {
							errors.push(source_field_hierarchy.error);
						}
						return;
					}

					graph.safe_add_directed_edge(
						list_note_page.file.path,
						source_path,
						{
							explicit: true,
							source: "list_note",
							...(source_field_hierarchy.data ??
								list_note_info.data),
						},
					);
				}

				// NOTE: The logic of this function is _just_ complicated enough to warrent a separate function
				// to prevent multiple levels of if statement nesting
				handle_next_list_item({
					graph,
					plugin,
					source_path,
					list_note_info,
					list_note_page,
					source_list_item_i,
				});

				source_list_item.children.forEach((target_list_item) => {
					const target_link = target_list_item.outlinks.at(0);
					if (!target_link) return;

					const target_field_hierarchy = resolve_field_override(
						plugin,
						target_list_item,
						list_note_page.file.path,
					);

					if (!target_field_hierarchy.ok) {
						if (target_field_hierarchy.error) {
							errors.push(target_field_hierarchy.error);
						}
						return;
					}

					const [target_path] = process_list_item({
						plugin,
						list_note_page,
						list_item_link: target_link,
					});

					// It's redundant, but easier to just safe_add_node here on the target
					// Technically, the next iteration of page.file.lists will add it (as a source)
					// But then I'd need to break up the iteration to first gather all sources, then handle the targets
					// This way we can guarentee the target exists
					graph.safe_add_node(target_path, { resolved: false });

					graph.safe_add_directed_edge(source_path, target_path, {
						explicit: true,
						source: "list_note",
						...(target_field_hierarchy.data ?? list_note_info.data),
					});
				});
			},
		);
	});

	return { errors };
};
