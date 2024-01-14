import { MultiGraph } from "graphology";
import type { BreadcrumbsGraph, GraphBuilder } from "src/interfaces/graph";
import type BreadcrumbsPlugin from "src/main";
import { get_field_hierarchy } from "src/utils/hierarchies";
import { implied_relationships } from "./implied_relationships";

const add_frontmatter_links: GraphBuilder = (graph, plugin) => {
	plugin.app.vault.getMarkdownFiles().forEach((source_file) => {
		const source_cache = plugin.app.metadataCache.getFileCache(source_file);

		source_cache?.frontmatterLinks?.forEach((target_link) => {
			const field = target_link.key;

			const field_hierarchy = get_field_hierarchy(
				plugin.settings.hierarchies,
				field
			);
			if (!field_hierarchy) {
				return console.log("No field hierarchy found for:", field);
			}

			const target_file = plugin.app.metadataCache.getFirstLinkpathDest(
				target_link.link,
				source_file.path
			);

			if (target_file) {
				// If the file exists, we should have already added a node for it in the simple loop over all markdown files
				graph.addDirectedEdge(source_file.path, target_file.path, {
					field,
					explicit: true,
					dir: field_hierarchy.dir,
					source: "frontmatter:link",
					hierarchy_i: field_hierarchy.hierarchy_i,
				});
			} else {
				// It's an unresolved link, so we add a node for it
				const unresolved_target_path = target_link.link + ".md";

				graph.addNode(unresolved_target_path, { resolved: false });

				graph.addDirectedEdge(
					source_file.path,
					unresolved_target_path,
					{
						field,
						explicit: true,
						dir: field_hierarchy.dir,
						source: "frontmatter:link",
						hierarchy_i: field_hierarchy.hierarchy_i,
					}
				);
			}
		});
	});

	return graph;
};

export const rebuild_graph = (plugin: BreadcrumbsPlugin) => {
	// Make a new graph, instead of mutating the old one
	const graph: BreadcrumbsGraph = new MultiGraph();

	const all_files = plugin.app.vault.getMarkdownFiles();

	// Or should we rather add nodes as the come up?
	all_files.forEach((file) => {
		graph.addNode(file.path, { resolved: true });
	});

	add_frontmatter_links(graph, plugin);

	// Implied relationships
	Object.entries(implied_relationships).forEach(([kind, fn]) => {
		fn(graph, plugin);
	});

	// console.log("all nodes:", graph.nodes());
	// console.log(
	// 	"all edges:",
	// 	graph.mapEdges(
	// 		(_, _attr, source_id, target_id) => `${source_id} -> ${target_id}`
	// 	)
	// );
	return graph;
};
