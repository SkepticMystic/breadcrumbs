import {
	EXPLICIT_EDGE_SOURCES,
	type ExplicitEdgeSource,
} from "src/const/graph";
import type { ExplicitEdgeBuilder } from "src/interfaces/graph";
import type BreadcrumbsPlugin from "src/main";
import { BCGraph, type BCNodeAttributes } from "../MyMultiGraph";
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

export const rebuild_graph = (plugin: BreadcrumbsPlugin) => {
	// Make a new graph, instead of mutating the old one
	const graph = new BCGraph();

	// Get once, send to all builders
	const all_files = get_all_files(plugin.app);

	// Add initial nodes
	add_initial_nodes(graph, all_files);

	// TODO: Each GraphBuilder should gather and return any errors on the way
	// For example, if a file has the `BC-tag-note-field` key, but the value isn't valid, we can surface that

	// Explicit edges
	const explicit_edge_results = EXPLICIT_EDGE_SOURCES.reduce(
		(acc, key) => {
			const result = add_explicit_edges[key](graph, plugin, all_files);

			acc[key] = result;
			return acc;
		},
		{} as Record<ExplicitEdgeSource, ReturnType<ExplicitEdgeBuilder>>,
	);

	console.log("explicit_edge_results:", explicit_edge_results);

	// Implied edges
	Object.entries(add_implied_edges).forEach(([kind, fn]) => {
		console.log("add_implied_edges:", kind);
		fn(graph, plugin, all_files);
	});

	return graph;
};
