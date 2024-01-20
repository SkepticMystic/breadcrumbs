import { Notice } from "obsidian";
import { META_FIELD } from "src/const/metadata_fields";
import type {
	ExplicitEdgeBuilder,
	GraphBuildError,
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

	const exclude_index = Boolean(
		metadata[META_FIELD["list-note-exclude-index"]],
	);

	return succ({
		field,
		exclude_index,
		dir: field_hierarchy.dir,
		hierarchy_i: field_hierarchy.hierarchy_i,
	});
};

// TODO: Allow custom fields per list-item
//   e.g. "- down [[note]]"
export const _add_explicit_edges_list_note: ExplicitEdgeBuilder = (
	graph,
	plugin,
	all_files,
) => {
	const errors: GraphBuildError[] = [];

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
			// 	list_item;
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
		list_note_page.file.lists.values.forEach((source_list_item) => {
			// If there are no links on the line, ignore it.
			// I guess this is a way to add "comments" to the hierarchy?
			// Maybe it can be used to override options for subsequent children? e.g. "- field:down"
			const source_link = source_list_item.outlinks.at(0);
			if (!source_link) return;

			const unsafe_source_path = Paths.ensure_ext(source_link.path);
			const source_file = plugin.app.metadataCache.getFirstLinkpathDest(
				unsafe_source_path,
				list_note_page.file.path,
			);

			// If it's resolved, use that path as is. If not, resolve it from the current context
			const source_path =
				source_file?.path ??
				Links.resolve_to_absolute_path(
					plugin.app,
					unsafe_source_path,
					list_note_page.file.path,
				);

			// The node wouldn't have been added in the simple_loop if it wasn't resolved.
			//   NOTE: Don't just use graph.addNode though. A different GraphBuilder may have added it.
			// RE aliases. If it was added in the simple loop, we've handled its aliases already
			//   If not, then it's not resolved and so it can't have aliases
			if (!source_file) {
				graph.safe_add_node(source_path, {
					resolved: Boolean(source_file),
				});
			}

			// Then, add the edge from the list_note itself, to the top-level list_items (if it's not excluded)
			if (
				!list_note_info.data.exclude_index &&
				source_list_item.position.start.col === 0
			) {
				graph.addDirectedEdge(list_note_page.file.path, source_path, {
					explicit: true,
					source: "list_note",
					...list_note_info.data,
				});
			}

			source_list_item.children.forEach((target_list_item) => {
				const target_link = target_list_item.outlinks.at(0);
				if (!target_link) return;

				const unsafe_target_path = Paths.ensure_ext(target_link.path);

				const target_file =
					plugin.app.metadataCache.getFirstLinkpathDest(
						target_link.path,
						list_note_page.file.path,
					);

				const target_path =
					target_file?.path ??
					Links.resolve_to_absolute_path(
						plugin.app,
						unsafe_target_path,
						// Still resolve from the list_note, not the source_note above the target
						list_note_page.file.path,
					);

				// It's redundant, but easier to just safe_add_node here on the target
				// Technically, the next iteration of page.file.lists will add it (as a source)
				// But then I'd need to break up the iteration to first gather all sources, then handle the targets
				graph.safe_add_node(target_path, { resolved: false });

				graph.addDirectedEdge(source_path, target_path, {
					explicit: true,
					source: "list_note",
					...list_note_info.data,
				});
			});
		});
	});

	return { errors };
};
