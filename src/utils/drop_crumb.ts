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

const linkify_edge = (plugin: BreadcrumbsPlugin, struct: EdgeStruct) => {
	const target_path = struct.target_path(plugin.graph);

	// target_id is a full path
	const target_file = plugin.app.vault.getFileByPath(target_path);

	if (!target_file) {
		return `[[${Paths.drop_ext(target_path)}]]`;
	} else {
		return plugin.app.fileManager.generateMarkdownLink(
			target_file,
			struct.source_path(plugin.graph),
			undefined,
			struct.target_data(plugin.graph).aliases?.at(0),
		);
	}
};

export const drop_crumbs = async (
	plugin: BreadcrumbsPlugin,
	destination_file: TFile,
	crumbs: EdgeStruct[],
	options: { destination: CrumbDestination | "none" },
) => {
	if (!crumbs.length) return;

	const links_by_field = group_projection(
		group_by(crumbs, (e) => e.edge_type),
		(edges) => edges.map((e) => linkify_edge(plugin, e)),
	);

	switch (options.destination) {
		case "frontmatter": {
			let mutated = false;

			const frontmatter =
				plugin.app.metadataCache.getFileCache(destination_file)
					?.frontmatter ?? {};

			Object.entries(links_by_field).forEach(([field, links]) => {
				if (!links?.length) return;

				const existing = frontmatter[field];
				if (existing) {
					const existing_array = ensure_is_array(existing);
					const new_links = remove_duplicates(
						existing_array.concat(links),
					);

					if (new_links.length !== existing_array.length) {
						mutated = true;
						frontmatter[field] = new_links;
					}
				} else {
					mutated = true;
					frontmatter[field] = links;
				}
			});

			if (mutated) {
				await plugin.app.fileManager.processFrontMatter(
					destination_file,
					(old_frontmatter) => {
						const new_frontmatter = Object.assign(
							old_frontmatter,
							frontmatter,
						);

						log.debug(
							"drop_crumbs > processed frontmatter",
							new_frontmatter,
						);
					},
				);
			}

			break;
		}

		case "dataview-inline": {
			// TODO: Dedupe links using dv page API
			const dataview_fields = Object.entries(links_by_field)
				.map(([field, links]) => {
					if (!links?.length) return "";
					else return `${field}:: ${links.join(", ")}`;
				})
				.filter(Boolean);

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
