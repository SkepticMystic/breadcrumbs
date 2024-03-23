import type {
	BreadcrumbsError,
	ExplicitEdgeBuilder,
} from "src/interfaces/graph";
import { ensure_is_array } from "src/utils/arrays";
import { get_field_hierarchy } from "src/utils/hierarchies";
import { resolve_relative_target_path } from "src/utils/obsidian";

// TODO: Check how date fields are handled
export const _add_explicit_edges_typed_link: ExplicitEdgeBuilder = (
	graph,
	plugin,
	all_files,
) => {
	const errors: BreadcrumbsError[] = [];

	all_files.obsidian?.forEach(
		({ file: source_file, cache: source_cache }) => {
			// On the Dataview branch, it's possible the field value is invalid.
			// But on the Obsidian route, we explictly check for links only
			source_cache?.frontmatterLinks?.forEach((target_link) => {
				// Using the List type of properties, the field is returned as <field>.<index>
				// We only want the field name, so we split on the dot and take the first element
				// This implies that we can't have a field name with a dot in it...
				const field = target_link.key.split(".")[0];

				const field_hierarchy = get_field_hierarchy(
					plugin.settings.hierarchies,
					field,
				);
				if (!field_hierarchy) return;

				const [target_path, target_file] = resolve_relative_target_path(
					plugin.app,
					target_link.link,
					source_file.path,
				);

				if (!target_file) {
					// It's an unresolved link, so we add a node for it
					//   (still using safe_add, as a different builder may have already added it)
					// Unresolved nodes don't have aliases
					graph.safe_add_node(target_path, { resolved: false });
				}

				graph.safe_add_directed_edge(source_file.path, target_path, {
					field,
					explicit: true,
					source: "typed_link",
					dir: field_hierarchy.dir,
					hierarchy_i: field_hierarchy.hierarchy_i,
				});
			});
		},
	);

	all_files.dataview?.forEach((page) => {
		const source_file = page.file;

		Object.keys(page).forEach((field) => {
			// NOTE: Implies that a hierarchy field can't be in this list,
			//   But Dataview probably enforces that anyway
			if (["file", "aliases"].includes(field)) return;

			const field_hierarchy = get_field_hierarchy(
				plugin.settings.hierarchies,
				field,
			);
			if (!field_hierarchy) return;

			// page[field]: Link | Link[] | Link[][]
			ensure_is_array(page[field])
				.flat()
				.forEach((target_link) => {
					if (
						// It _should_ be a Link, as we've confirmed the field is in a BC hierarchy
						// But, just in case, we check that it has a path
						typeof target_link !== "object" ||
						!target_link?.path
					) {
						return errors.push({
							code: "invalid_field_value",
							message: `Invalid field value for '${field}'`,
							path: source_file.path,
						});
					}

					const [target_path, target_file] =
						resolve_relative_target_path(
							plugin.app,
							target_link.path,
							source_file.path,
						);

					if (!target_file) {
						// It's an unresolved link, so we add a node for it
						// But still do it safely, as a previous file may point to the same unresolved node
						graph.safe_add_node(target_path, { resolved: false });
					}

					// If the file exists, we should have already added a node for it in the simple loop over all markdown files
					graph.safe_add_directed_edge(
						source_file.path,
						target_path,
						{
							field,
							explicit: true,
							source: "typed_link",
							dir: field_hierarchy.dir,
							hierarchy_i: field_hierarchy.hierarchy_i,
						},
					);
				});
		});
	});

	return { errors };
};
