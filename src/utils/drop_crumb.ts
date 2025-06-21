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
	options: { destination: CrumbDestination | "none" , included_fields?: string[], use_alias?: boolean },
) => {
	if (!crumbs.length) return;
	let included_fields: string[] = options.included_fields?.flatMap(key => plugin.settings.edge_field_groups.find(f => f.label === key)?.fields ?? []) ?? [];
	const links_by_field = group_projection(
		group_by(crumbs, (e) => e.attr.field!),
		(edges) =>
			edges.map((e) => {
				if (options.use_alias === true) {
					return linkify_edge(
						plugin,
						e.source_id,
						e.target_id,
						e.target_attr.aliases,
					);
				} else {
					return linkify_edge(
						plugin,
						e.source_id,
						e.target_id,
						undefined,
					);
				}
			}),
	);

	switch (options.destination) {
		case "frontmatter": {
			let mutated = false;

			const frontmatter =
				plugin.app.metadataCache.getFileCache(destination_file)
					?.frontmatter ?? {};

			Object.entries(links_by_field).forEach(([field, links]) => {
				if (!links?.length) return;
				if (included_fields.length && !included_fields.includes(field)) {
					return;
				}

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
					if (included_fields.length && !included_fields.includes(field)) {
						return "";
					}
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
