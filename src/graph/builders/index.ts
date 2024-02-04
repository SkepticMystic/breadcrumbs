import { EXPLICIT_EDGE_SOURCES } from "src/const/graph";
import type BreadcrumbsPlugin from "src/main";
import { BCGraph, type BCNodeAttributes } from "../MyMultiGraph";
import { objectify_edge_mapper } from "../objectify_mappers";
import { add_explicit_edges } from "./explicit";
import { get_all_files, type AllFiles } from "./explicit/files";
import { add_implied_edges } from "./implied";

const add_initial_nodes = (graph: BCGraph, all_files: AllFiles) => {
	if (all_files.obsidian) {
		all_files.obsidian.forEach(({ file, cache }) => {
			const node_attr: BCNodeAttributes = {
				resolved: true,
			};

			const aliases = cache?.frontmatter?.aliases as unknown;
			if (Array.isArray(aliases) && aliases.length > 0) {
				node_attr.aliases = aliases;
			}

			graph.addNode(file.path, node_attr);
		});
	} else {
		all_files.dataview.forEach((page) => {
			const node_attr: BCNodeAttributes = {
				resolved: true,
			};

			const aliases = page.file.aliases.values;
			if (Array.isArray(aliases) && aliases.length > 0) {
				node_attr.aliases = aliases;
			}

			graph.addNode(page.file.path, node_attr);
		});
	}
};

export const rebuild_graph = async (plugin: BreadcrumbsPlugin) => {
	// Make a new graph, instead of mutating the old one
	const graph = new BCGraph();

	// Get once, send to all builders
	const all_files = get_all_files(plugin.app);

	// Add initial nodes
	add_initial_nodes(graph, all_files);

	// Explicit edges
	console.groupCollapsed("add_explicit_edges");
	const explicit_edge_results = await Promise.all(
		EXPLICIT_EDGE_SOURCES.map(async (source) => {
			const result = await add_explicit_edges[source](
				graph,
				plugin,
				all_files,
			);
			return { source, result };
		}),
	);
	console.groupEnd();

	console.log("explicit_edge_results:", explicit_edge_results);

	// Implied edges
	const all_real_edges = graph
		.mapOutEdges(objectify_edge_mapper((e) => e))
		.filter((e) => e.attr.explicit);

	console.groupCollapsed("add_implied_edges");
	Object.entries(add_implied_edges).forEach(([kind, fn]) => {
		console.group(kind);

		fn(graph, plugin, all_real_edges);

		console.groupEnd();
	});
	console.groupEnd();

	return graph;
};
