import { dataview_plugin } from "src/external/dataview";
import type { IDataview } from "src/external/dataview/interfaces";
import type {
	BreadcrumbsEdgeAttributes,
	GraphBuilder,
} from "src/interfaces/graph";
import { ensure_array } from "src/utils/arrays";
import { get_field_hierarchy } from "src/utils/hierarchies";
import { ensure_ext } from "src/utils/paths";

const frontmatter_link: GraphBuilder = (graph, plugin) => {
	// NOTE: Dataview handles it's own links _and_ frontmatter links
	if (dataview_plugin.is_enabled(plugin.app)) {
		return graph;
	}
	console.log("frontmatter_link");

	const all_files = plugin.app.vault.getMarkdownFiles();

	// First add all nodes
	all_files.forEach((source_file) => {
		graph.addNode(source_file.path, { resolved: true });
	});

	// Then add the edges
	all_files.forEach((source_file) => {
		const source_cache = plugin.app.metadataCache.getFileCache(source_file);

		source_cache?.frontmatterLinks?.forEach((target_link) => {
			// Using the List type of properties, the field is returned as <field>.<index>
			// We only want the field name, so we split on the dot and take the first element
			// This implies that we can't have a field name with a dot in it...
			const field = target_link.key.split(".")[0];

			const field_hierarchy = get_field_hierarchy(
				plugin.settings.hierarchies,
				field
			);
			if (!field_hierarchy) {
				return console.log("No field hierarchy found for:", field);
			}

			const target_path = ensure_ext(target_link.link, ".md");
			const target_file = plugin.app.metadataCache.getFirstLinkpathDest(
				target_path,
				source_file.path
			);

			if (target_file) {
				// If the file exists, we should have already added a node for it in the simple loop over all markdown files
				graph.addDirectedEdge(source_file.path, target_file.path, {
					field,
					explicit: true,
					dir: field_hierarchy.dir,
					source: "frontmatter_link",
					hierarchy_i: field_hierarchy.hierarchy_i,
				});
			} else {
				// It's an unresolved link, so we add a node for it
				graph.addNode(target_path, { resolved: false });

				graph.addDirectedEdge(source_file.path, target_path, {
					field,
					explicit: true,
					dir: field_hierarchy.dir,
					source: "frontmatter_link",
					hierarchy_i: field_hierarchy.hierarchy_i,
				});
			}
		});
	});

	return graph;
};

const dataview_inline: GraphBuilder = (graph, plugin) => {
	if (!dataview_plugin.is_enabled(plugin.app)) {
		return graph;
	}
	console.log("dataview_inline");

	const dataview_api = dataview_plugin.get_api();
	if (!dataview_api) {
		console.warn("Dataview API not found");
		return graph;
	}
	console.log("dataview_api", dataview_api);

	const pages = dataview_api.pages().values as IDataview.Page[];

	// First add all nodes
	pages.forEach((page) => {
		graph.addNode(page.file.path, { resolved: true });
	});

	// Then add the edges
	pages.forEach((page) => {
		const source_file = page.file;

		Object.keys(page).forEach((field) => {
			// NOTE: Implies that a hierarchy field can't be in this list,
			//   But Dataview probably enforces that anyway
			if (["file", "aliases"].includes(field)) return;

			const field_hierarchy = get_field_hierarchy(
				plugin.settings.hierarchies,
				field
			);
			if (!field_hierarchy) {
				return console.log("No field hierarchy found for:", field);
			}

			// page[field]: Link | Link[]
			const target_links = ensure_array(page[field]) as IDataview.Link[];

			target_links.forEach((target_link) => {
				const target_path = ensure_ext(target_link.path, ".md");
				const target_file =
					plugin.app.metadataCache.getFirstLinkpathDest(
						target_path,
						source_file.path
					);

				if (target_file) {
					// If the file exists, we should have already added a node for it in the simple loop over all markdown files
					graph.addDirectedEdge(source_file.path, target_file.path, {
						field,
						explicit: true,
						dir: field_hierarchy.dir,
						// NOTE: I currently don't see a way to distinguish between frontmatter links and dataview links,
						//   when using the dataview API
						source: "dataview_inline",
						hierarchy_i: field_hierarchy.hierarchy_i,
					});
				} else {
					// It's an unresolved link, so we add a node for it
					graph.addNode(target_path, { resolved: false });

					graph.addDirectedEdge(source_file.path, target_path, {
						field,
						explicit: true,
						dir: field_hierarchy.dir,
						source: "dataview_inline",
						hierarchy_i: field_hierarchy.hierarchy_i,
					});
				}
			});
		});
	});

	return graph;
};

export const add_real_relationships: Record<
	Extract<BreadcrumbsEdgeAttributes, { explicit: true }>["source"],
	GraphBuilder
> = {
	frontmatter_link,
	dataview_inline,
};
