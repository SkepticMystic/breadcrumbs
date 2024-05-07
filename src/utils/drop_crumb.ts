import { TFile } from "obsidian";
import type { CrumbDestination } from "src/interfaces/settings";
import { log } from "src/logger";
import type BreadcrumbsPlugin from "src/main";
import {
	ensure_is_array,
	group_by,
	group_projection,
	remove_duplicates,
} from "src/utils/arrays";
import type { EdgeStruct } from "wasm/pkg/breadcrumbs_graph_wasm";
import { Paths } from "./paths";

const linkify_edge = (
	plugin: BreadcrumbsPlugin,
	{ source, target }: EdgeStruct,
) => {
	// target_id is a full path
	const target_file = plugin.app.vault.getFileByPath(target.path);

	if (!target_file) {
		return `[[${Paths.drop_ext(target.path)}]]`;
	} else {
		return plugin.app.fileManager.generateMarkdownLink(
			target_file,
			source.path,
			undefined,
			target.aliases?.at(0),
		);
	}
};

export const drop_crumbs = async (
	plugin: BreadcrumbsPlugin,
	destination_file: TFile,
	crumbs: EdgeStruct[],
	options: { destination: CrumbDestination | "none" },
) => {
	const links_by_field = group_projection(
		group_by(crumbs, (e) => e.edge_type),
		(edges) => edges.map((e) => linkify_edge(plugin, e)),
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
