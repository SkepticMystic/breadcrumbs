import type { TFile } from "obsidian";
import type { BCEdge } from "src/graph/MyMultiGraph";
import { objectify_edge_mapper } from "src/graph/objectify_mappers";
import { is_self_loop } from "src/graph/utils";
import type { BreadcrumbsSettings } from "src/interfaces/settings";
import type BreadcrumbsPlugin from "src/main";
import { ensure_is_array, group_by, remove_duplicates } from "src/utils/arrays";

const linkify_edge = (plugin: BreadcrumbsPlugin, edge: BCEdge) => {
	const target_file = plugin.app.metadataCache.getFirstLinkpathDest(
		edge.target_id,
		"", // target_id is a full path
	);

	if (!target_file) {
		// NOTE: Wait... by definition, the target file points to the source.
		// Can it be the case that an _unresolved_ target has an explicit edge?
		// I think one of the edge builders relies on this question, as well
		console.log("unresolved target", edge.target_id);
		return `[[${edge.target_id}]]`;
	} else {
		return plugin.app.fileManager.generateMarkdownLink(
			target_file,
			edge.source_id,
			undefined,
			edge.target_attr.aliases?.at(0),
		);
	}
};

export const freeze_implied_edges_to_note = async (
	plugin: BreadcrumbsPlugin,
	source_file: TFile,
	options: BreadcrumbsSettings["commands"]["freeze_implied_edges"]["default_options"],
) => {
	const implied_edges = plugin.graph
		.mapOutEdges(
			source_file.path,
			objectify_edge_mapper((e) => e),
		)
		.filter(
			(e) =>
				!e.attr.explicit &&
				// Don't freeze a note to itself (self_is_sibling)
				!is_self_loop(e) &&
				// If field === null, we don't have an opposite field to freeze to
				e.attr.field !== null,
		);

	console.log("implied_edges", implied_edges);

	const implied_edges_by_field = group_by(
		implied_edges,
		(e) => e.attr.field!,
	);

	switch (options.destination) {
		case "frontmatter": {
			await plugin.app.fileManager.processFrontMatter(
				source_file,
				(frontmatter) => {
					Object.keys(implied_edges_by_field).forEach((field) => {
						const edges = implied_edges_by_field[field]!;

						const links = edges.map((e) => linkify_edge(plugin, e));

						const existing = frontmatter[field];
						if (existing) {
							frontmatter[field] = remove_duplicates(
								ensure_is_array(existing).concat(links),
							);
						} else {
							frontmatter[field] = links;
						}
					});
					console.log("frontmatter", frontmatter);
				},
			);
			break;
		}

		case "dataview-inline": {
			const dataview_fields: string[] = [];

			Object.keys(implied_edges_by_field).forEach((field) => {
				const edges = implied_edges_by_field[field]!;

				const links = edges.map((e) => linkify_edge(plugin, e));

				dataview_fields.push(`${field}:: ${links.join(", ")}`);
			});

			console.log("dataview_fields", dataview_fields);

			await plugin.app.vault.process(source_file, (content) => {
				content += "\n\n" + dataview_fields.join("\n");

				return content;
			});

			break;
		}
	}
};
