import type {
	BreadcrumbsError,
	ExplicitEdgeBuilder,
} from "src/interfaces/graph";
import { log } from "src/logger";
import { ensure_is_array } from "src/utils/arrays";
import { resolve_relative_target_path } from "src/utils/obsidian";

const MARKDOWN_LINK_REGEX = /\[(.+?)\]\((.+?)\)/;

export const _add_explicit_edges_typed_link: ExplicitEdgeBuilder = (
	graph,
	plugin,
	all_files,
) => {
	const errors: BreadcrumbsError[] = [];

	const field_labels = plugin.settings.edge_fields.map((f) => f.label);

	all_files.obsidian?.forEach(
		({ file: source_file, cache: source_cache }) => {
			// On the Dataview branch, it's possible the field value is invalid.
			// But on the Obsidian route, we explictly check for links only
			source_cache?.frontmatterLinks?.forEach((target_link) => {
				// Using the List type of properties, the field is returned as <field>.<index>
				// We only want the field name, so we split on the dot and take the first element
				// This implies that we can't have a field name with a dot in it...
				const field = target_link.key.split(".")[0];
				if (!field_labels.includes(field)) return;

				const [target_path, target_file] = resolve_relative_target_path(
					plugin.app,
					target_link.link,
					source_file.path,
				);

				if (!target_file) {
					// Unresolved nodes don't have aliases
					graph.safe_add_node(target_path, { resolved: false });
				}

				graph.safe_add_directed_edge(source_file.path, target_path, {
					field,
					explicit: true,
					source: "typed_link",
				});
			});
		},
	);

	all_files.dataview?.forEach((page) => {
		const source_file = page.file;

		// TODO: Instead of iterating all keys, I could use the edge_fields...
		// Is that better or worse?
		Object.keys(page).forEach((field) => {
			// NOTE: Implies that an edge-field can't be in this list,
			//   But Dataview probably enforces that anyway
			if (
				["file", "aliases"].includes(field) ||
				!field_labels.includes(field)
			) {
				return;
			}

			// page[field]: Link | Link[] | Link[][]
			ensure_is_array(page[field])
				.flat()
				.forEach((target_link) => {
					let unsafe_target_path: string | undefined;

					if (typeof target_link === "string") {
						// Try parse as a markdown link [](), grabbing the path out of the 2nd match
						unsafe_target_path =
							target_link.match(MARKDOWN_LINK_REGEX)?.[2];
					} else if (
						typeof target_link === "object" &&
						target_link?.path
					) {
						unsafe_target_path = target_link.path;
					} else if (
						//@ts-ignore: instanceof didn't work here?
						target_link?.isLuxonDateTime
					) {
						// NOTE: The original, unparsed value is no longer available
						// So we just skip it for now
						log.debug(
							"builder:typed-link > Ignoring DateTime for field:",
							field,
						);

						return;
					} else {
						// warn because we know it's a BC field, with a definitely invalid value
						log.warn(
							"builder:typed-link > Invalid target_link type",
							target_link,
						);
					}

					if (!unsafe_target_path) {
						return errors.push({
							code: "invalid_field_value",
							message: `Invalid field value for '${field}'`,
							path: source_file.path,
						});
					}

					const [target_path, target_file] =
						resolve_relative_target_path(
							plugin.app,
							unsafe_target_path,
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
						},
					);
				});
		});
	});

	return { errors };
};
