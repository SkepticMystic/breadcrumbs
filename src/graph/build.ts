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

	all_files.forEach((file) => {
		const file_cache = plugin.app.metadataCache.getFileCache(file);

		file_cache?.frontmatterLinks?.forEach((link) => {
			console.log("frontmatter_link:", link);

			// link.link is the full path to the file, but doesn't have an extension
			// (Obsidian resolves filename clashes by using the full path, if necessary)
			graph.addDirectedEdge(file.path, link.link + ".md", {
				real: true,
				field: link.key,
				source: "frontmatter:link",
			});
		});
	});

	return graph;
};

const add_implied_opposite: GraphBuilder = (graph, plugin) => {
	graph.forEachOutEdge((edge, attr, source, target) => {
		const opposite_fields = get_opposite_fields(
			plugin.settings.hierarchies,
			attr.field
		);

		graph.addEdge(target, source, {
			real: false,
			implied_kind: "opposite",
			field: opposite_fields[0],
		});
	});

	return graph;
};

export const rebuildGraph = (plugin: BreadcrumbsPlugin) => {
	// Make a new graph, instead of mutating the old one
	const graph: BreadcrumbsGraph = new MultiGraph();

	const all_files = plugin.app.vault.getMarkdownFiles();
	console.log("all_files:", all_files);

	// Or should we rather add nodes as the come up?
	all_files.forEach((file) => {
		// Add all the nodes first
		console.log("file.path:", file.path);
		graph.addNode(file.path);
	});

	add_frontmatter_links(graph, plugin);

	add_implied_opposite(graph, plugin);

	console.log("nodes:", graph.nodes());
	console.log(
		"edges:",
		graph.mapEdges((_, attr, source, target) => `${source} -> ${target}`)
	);
	return graph;
};
