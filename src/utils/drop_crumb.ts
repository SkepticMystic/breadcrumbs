import { TFile } from "obsidian";
import type {
	BCEdge,
	BCEdgeAttributes,
	BCNodeAttributes,
} from "src/graph/MyMultiGraph";
import type { CrumbDestination } from "src/interfaces/settings";
import type BreadcrumbsPlugin from "src/main";
import {
	ensure_is_array,
	group_by,
	group_projection,
	remove_duplicates,
} from "src/utils/arrays";

const linkify_edge = (
	plugin: BreadcrumbsPlugin,
	source_id: string,
	target_id: string,
	target_aliases: string[] | undefined,
) => {
	// target_id is a full path
	const target_file = plugin.app.vault.getAbstractFileByPath(target_id);

	if (!target_file) {
		// NOTE: Wait... by definition, the target file points to the source.
		// Can it be the case that an _unresolved_ target has an explicit edge?
		// I think one of the edge builders relies on this question, as well
		plugin.log.info("unresolved target", target_id);

		return `[[${target_id}]]`;
	} else if (target_file instanceof TFile) {
		return plugin.app.fileManager.generateMarkdownLink(
			target_file,
			source_id,
			undefined,
			target_aliases?.at(0),
		);
	} else {
		// NOTE: This is a folder or something else
		return `[[${target_id}]]`;
	}
};

export const drop_crumbs = async (
	plugin: BreadcrumbsPlugin,
	destination_file: TFile,
	crumbs: (Pick<BCEdge, "source_id" | "target_id"> & {
		attr: Pick<BCEdgeAttributes, "field">;
		target_attr: Pick<BCNodeAttributes, "aliases">;
	})[],
	options: { destination: CrumbDestination | "none" },
) => {
	const links_by_field = group_projection(
		group_by(crumbs, (e) => e.attr.field!),
		(edges) =>
			edges.map((e) =>
				linkify_edge(
					plugin,
					e.source_id,
					e.target_id,
					e.target_attr.aliases,
				),
			),
	);

	switch (options.destination) {
		case "frontmatter": {
			await plugin.app.fileManager.processFrontMatter(
				destination_file,
				(frontmatter) => {
					Object.keys(links_by_field).forEach((field) => {
						const links = links_by_field[field]!;

						const existing = frontmatter[field];
						if (existing) {
							frontmatter[field] = remove_duplicates(
								ensure_is_array(existing).concat(links),
							);
						} else {
							frontmatter[field] = links;
						}
					});

					plugin.log.debug("frontmatter", frontmatter);
				},
			);
			break;
		}

		case "dataview-inline": {
			const dataview_fields = Object.keys(links_by_field).map((field) => {
				const links = links_by_field[field]!;

				return `${field}:: ${links.join(", ")}`;
			});

			// NOTE: Just appends for now
			await plugin.app.vault.process(destination_file, (content) => {
				content += "\n\n" + dataview_fields.join("\n");

				return content;
			});

			break;
		}

		case "none": {
			// Do nothing
			break;
		}
	}
};
