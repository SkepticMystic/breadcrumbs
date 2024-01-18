import type { ExplicitEdgeBuilder, GraphError } from "src/interfaces/graph";
import { ensure_is_array } from "src/utils/arrays";
import { get_field_hierarchy } from "src/utils/hierarchies";
import { Path } from "src/utils/paths";

export const _add_explicit_edges_typed_link: ExplicitEdgeBuilder = (
	graph,
	plugin,
	all_files,
) => {
	const errors: GraphError[] = [];

	all_files.obsidian?.forEach(
		({ file: source_file, cache: source_cache }) => {
			source_cache?.frontmatterLinks?.forEach((target_link) => {
				// Using the List type of properties, the field is returned as <field>.<index>
				// We only want the field name, so we split on the dot and take the first element
				// This implies that we can't have a field name with a dot in it...
				const field = target_link.key.split(".")[0];

				const field_hierarchy = get_field_hierarchy(
					plugin.settings.hierarchies,
					field,
				);
				if (!field_hierarchy) {
					return console.log("No field hierarchy found for:", field);
				}

				const target_path = Path.ensure_ext(target_link.link);
				const target_file =
					plugin.app.metadataCache.getFirstLinkpathDest(
						target_path,
						source_file.path,
					);

				if (target_file) {
					// If the file exists, we should have already added a node for it in the simple loop over all markdown files
					graph.addDirectedEdge(source_file.path, target_file.path, {
						field,
						explicit: true,
						source: "typed_link",
						dir: field_hierarchy.dir,
						hierarchy_i: field_hierarchy.hierarchy_i,
					});
				} else {
					// It's an unresolved link, so we add a node for it
					graph.addNode(target_path, { resolved: false });

					graph.addDirectedEdge(source_file.path, target_path, {
						field,
						explicit: true,
						source: "typed_link",
						dir: field_hierarchy.dir,
						hierarchy_i: field_hierarchy.hierarchy_i,
					});
				}
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

			// page[field]: Link | Link[]
			const target_links = ensure_is_array(page[field]);

			target_links.forEach((target_link) => {
				if (
					// It _should_ be a Link, so we've confirmed the field is in a BC hierarchy
					// But, just in case, we check that it has a path
					typeof target_link !== "object" ||
					target_link.path === undefined
				) {
					return;
				}

				// Dataview does a weird thing... it adds the ext to _resolved_ links, but not unresolved links.
				// So, we ensure it here
				const target_path = Path.ensure_ext(target_link.path);
				const target_file =
					plugin.app.metadataCache.getFirstLinkpathDest(
						target_path,
						source_file.path,
					);

				if (target_file) {
					// If the file exists, we should have already added a node for it in the simple loop over all markdown files
					graph.addDirectedEdge(source_file.path, target_file.path, {
						field,
						explicit: true,
						source: "typed_link",
						dir: field_hierarchy.dir,
						hierarchy_i: field_hierarchy.hierarchy_i,
					});
				} else {
					// It's an unresolved link, so we add a node for it
					graph.addNode(target_path, { resolved: false });

					graph.addDirectedEdge(source_file.path, target_path, {
						field,
						explicit: true,
						source: "typed_link",
						dir: field_hierarchy.dir,
						hierarchy_i: field_hierarchy.hierarchy_i,
					});
				}
			});
		});
	});

	return { errors };
};
