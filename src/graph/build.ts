import { MultiGraph } from "graphology";
import type { BreadcrumbsGraph } from "src/interfaces/graph";
import type BreadcrumbsPlugin from "src/main";
import {
	get_field_hierarchy,
	get_opposite_direction,
	get_opposite_fields,
} from "src/utils/hierarchies";

/** "Extension" system. Takes in current state of plugin & graph, and adds to the graph */
type GraphBuilder = (
	graph: BreadcrumbsGraph,
	plugin: BreadcrumbsPlugin
) => BreadcrumbsGraph;

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
				dir: get_opposite_direction(attr.dir),
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
		graph.addNode(file.path, { resolved: true });
	});

	add_frontmatter_links(graph, plugin);

	add_implied_opposite(graph, plugin);

	console.log("all nodes:", graph.nodes());
	console.log(
		"all edges:",
		graph.mapEdges(
			(_, _attr, source_id, target_id) => `${source_id} -> ${target_id}`
		)
	);
	return graph;
};
