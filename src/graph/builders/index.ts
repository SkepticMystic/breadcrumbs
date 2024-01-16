import { MultiGraph } from "graphology";
import type { BCGraph, BCNodeAttributes } from "src/interfaces/graph";
import type BreadcrumbsPlugin from "src/main";
import { add_explicit_edges } from "./explicit";
import { get_all_files, type AllFiles } from "./explicit/files";
import { add_implied_relationships } from "./implied";

const add_initial_nodes = (graph: BCGraph, all_files: AllFiles) => {
	if (all_files.obsidian) {
		all_files.obsidian.forEach((file) => {
			graph.addNode(file.path, { resolved: true });
		});
	} else {
		all_files.dataview.forEach((page) => {
			const node_attr: BCNodeAttributes = {
				resolved: true,
			};

			if (page.aliases) {
				node_attr.aliases = page.aliases;
			}

			graph.addNode(page.file.path, node_attr);
		});
	}
};

export const rebuild_graph = (plugin: BreadcrumbsPlugin) => {
	// Make a new graph, instead of mutating the old one
	const graph: BCGraph = new MultiGraph();

	// Get once, send to all builders
	const all_files = get_all_files(plugin.app);

	// Add initial nodes
	add_initial_nodes(graph, all_files);

	// TODO: Each GraphBuilder should gather and return any errors on the way
	// For example, if a file has the `BC-tag-note-field` key, but the value isn't valid, we can surface that

	// Real relationships
	Object.entries(add_explicit_edges).forEach(([kind, fn]) => {
		fn(graph, plugin, all_files);
	});

	// Implied relationships
	Object.entries(add_implied_relationships).forEach(([kind, fn]) => {
		fn(graph, plugin, all_files);
	});

	return graph;
};
