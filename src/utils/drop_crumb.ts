import { TFile } from "obsidian";
import type {
	BCEdge,
	BCEdgeAttributes,
	BCNodeAttributes,
} from "src/graph/MyMultiGraph";
import type { CrumbDestination } from "src/interfaces/settings";
import { log } from "src/logger";
import type BreadcrumbsPlugin from "src/main";
import {
	ensure_is_array,
	group_by,
	group_projection,
	remove_duplicates,
} from "src/utils/arrays";
import { Paths } from "./paths";

const linkify_edge = (
	plugin: BreadcrumbsPlugin,
	source_id: string,
	target_id: string,
	target_aliases: string[] | undefined,
) => {
	// target_id is a full path
	const target_file = plugin.app.vault.getFileByPath(target_id);

	if (!target_file) {
		return `[[${Paths.drop_ext(target_id)}]]`;
	} else {
		return plugin.app.fileManager.generateMarkdownLink(
			target_file,
			source_id,
			undefined,
			target_aliases?.at(0),
		);
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

					log.debug(
						"drop_crumbs > processed frontmatter",
						frontmatter,
					);
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
