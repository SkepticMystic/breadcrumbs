import { MultiGraph } from "graphology";
import type BreadcrumbsPlugin from "main";
import type { BreadcrumbsGraph } from "src/interfaces/graph";
import { get_opposite_fields } from "src/utils/hierarchies";

/** "Extension" system. Takes in current state of plugin & graph, and adds to the graph */
type GraphBuilder = (
	graph: BreadcrumbsGraph,
	plugin: BreadcrumbsPlugin
) => BreadcrumbsGraph;

const add_frontmatter_links: GraphBuilder = (graph, plugin) => {
	// Add the source: "frontmatter:link" edges while we're here
	const all_files = plugin.app.vault.getMarkdownFiles();

	all_files.forEach((source_file) => {
		const source_cache = plugin.app.metadataCache.getFileCache(source_file);

		source_cache?.frontmatterLinks?.forEach((target_link) => {
			const target_file = plugin.app.metadataCache.getFirstLinkpathDest(
				target_link.link,
				source_file.path
			);

			if (target_file) {
				// If the file exists, we should have already added a node for it in the simple loop over all markdown files
				graph.addDirectedEdge(source_file.path, target_file.path, {
					explicit: true,
					field: target_link.key,
					source: "frontmatter:link",
				});
			} else {
				// It's an unresolved link, so we add a node for it
				const unresolved_target_path = target_link.link + ".md";

				graph.addNode(unresolved_target_path, { resolved: false });

				graph.addDirectedEdge(
					source_file.path,
					unresolved_target_path,
					{
						explicit: true,
						field: target_link.key,
						source: "frontmatter:link",
					}
				);
			}
		});
	});

	return graph;
};

const add_implied_opposite: GraphBuilder = (graph, plugin) => {
	// NOTE: Rather than directly forEachOutEdge, we map over them to "freeze" the existing ones, then add edges (to avoid infite loop)
	graph
		.mapOutEdges((_edge_id, attr, source, target) => ({
			attr,
			source,
			target,
		}))
		.forEach(({ attr, source, target }) => {
			const opposite_field = get_opposite_fields(
				plugin.settings.hierarchies,
				attr.field
			).at(0);

			if (!opposite_field) {
				console.log("No opposite field found for:", attr.field);
				return;
			}

			graph.addDirectedEdge(target, source, {
				explicit: false,
				field: opposite_field,
				implied_kind: "opposite",
			});
		});

	return graph;
};

export const rebuild_graph = (plugin: BreadcrumbsPlugin) => {
	// Make a new graph, instead of mutating the old one
	const graph: BreadcrumbsGraph = new MultiGraph();

	const all_files = plugin.app.vault.getMarkdownFiles();
	console.log("all_files:", all_files);

	// Or should we rather add nodes as the come up?
	all_files.forEach((file) => {
		// Add all the nodes first
		console.log("adding node:", file.path);
		graph.addNode(file.path, { resolved: true });
	});

	add_frontmatter_links(graph, plugin);

	add_implied_opposite(graph, plugin);

	console.log("all nodes:", graph.nodes());
	console.log(
		"all edges:",
		graph.mapEdges((_, attr, source, target) => `${source} -> ${target}`)
	);
	return graph;
};
